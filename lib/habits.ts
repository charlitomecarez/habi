import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, getDay, startOfWeek, subDays } from "date-fns";

import { fromHomeSummary, slice } from "@/lib/home-summary";
import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/types/database";

export type HabitSchedule = Enums<"habit_schedule">;
export type Habit = Omit<Tables<"habits">, "user_id" | "updated_at">;

const HABITS_KEY = ["habits"] as const;
/** Checks older than this are not needed for streaks or the month grid on screen. */
const HISTORY_DAYS = 400;

export const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Set days" },
  { value: "times_per_week", label: "Times a week" },
] as const satisfies readonly { value: HabitSchedule; label: string }[];

export const day = (d: Date) => format(d, "yyyy-MM-dd");
/** Weeks run Monday to Sunday, the same as the reminders. */
const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

export function scheduleText(h: Pick<Habit, "schedule" | "weekdays" | "times_per_week">): string {
  if (h.schedule === "daily") return "Every day";
  if (h.schedule === "times_per_week") return `${h.times_per_week ?? 1} times a week`;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return [...h.weekdays]
    .sort()
    .map((d) => names[d])
    .join(", ");
}

/** True when the habit is on the schedule that day (for "times a week", every day counts). */
export function isScheduled(h: Pick<Habit, "schedule" | "weekdays">, date: Date): boolean {
  return h.schedule !== "weekdays" || h.weekdays.includes(getDay(date));
}

export function weekCount(checks: Set<string>, date: Date): number {
  const start = weekStart(date);
  let n = 0;
  for (let i = 0; i < 7; i++) if (checks.has(day(addDays(start, i)))) n++;
  return n;
}

/**
 * The current streak. Daily and set-day habits count scheduled days in a row; a day off the
 * schedule does not break it, and today only counts once ticked. "Times a week" counts weeks
 * that reached the number; this week counts once it has.
 */
export function streak(
  h: Pick<Habit, "schedule" | "weekdays" | "times_per_week" | "created_at">,
  checks: Set<string>,
  now = new Date(),
): { count: number; unit: "day" | "week" } {
  const created = new Date(h.created_at);
  if (h.schedule === "times_per_week") {
    const target = h.times_per_week ?? 1;
    let week = weekStart(now);
    if (weekCount(checks, week) < target) week = subDays(week, 7);
    let count = 0;
    while (weekCount(checks, week) >= target && week >= weekStart(created)) {
      count++;
      week = subDays(week, 7);
    }
    return { count, unit: "week" };
  }
  let d = checks.has(day(now)) ? now : subDays(now, 1);
  let count = 0;
  for (let i = 0; i < HISTORY_DAYS; i++, d = subDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    if (!checks.has(day(d))) break;
    count++;
  }
  return { count, unit: "day" };
}

/** Habits that are not archived, with every check from the last HISTORY_DAYS days. */
export function useHabits() {
  return useQuery({
    queryKey: HABITS_KEY,
    queryFn: async () => {
      const since = day(subDays(new Date(), HISTORY_DAYS));
      type Rows = { habits: Habit[]; checks: { habit_id: string; on_date: string }[] };
      const rows = await fromHomeSummary<Rows>(
        (s, p) => {
          const habits = slice<Habit[]>(s, "habits");
          const checks = slice<Rows["checks"]>(s, "habit_checks");
          return habits && checks && p.p_habits_since === since ? { habits, checks } : undefined;
        },
        async () => {
          const [habits, checks] = await Promise.all([
            supabase
              .from("habits")
              .select("id, name, schedule, weekdays, times_per_week, remind_time, archived, created_at")
              .eq("archived", false)
              .order("created_at"),
            supabase.from("habit_checks").select("habit_id, on_date").gte("on_date", since),
          ]);
          if (habits.error) throw habits.error;
          if (checks.error) throw checks.error;
          return { habits: habits.data as Habit[], checks: checks.data };
        },
      );
      const byHabit = new Map<string, Set<string>>();
      for (const c of rows.checks) {
        if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, new Set());
        byHabit.get(c.habit_id)!.add(c.on_date);
      }
      return { habits: rows.habits, checks: byHabit };
    },
  });
}

/** Ticks or unticks a habit for a day. The screen updates before the server answers. */
export function useToggleCheck() {
  const client = useQueryClient();
  type Data = { habits: Habit[]; checks: Map<string, Set<string>> };
  return useMutation({
    mutationFn: async ({ habitId, date, done }: { habitId: string; date: string; done: boolean }) => {
      const { error } = done
        ? await supabase
            .from("habit_checks")
            .upsert({ habit_id: habitId, on_date: date }, { onConflict: "habit_id,on_date" })
        : await supabase.from("habit_checks").delete().eq("habit_id", habitId).eq("on_date", date);
      if (error) throw error;
    },
    onMutate: async ({ habitId, date, done }) => {
      await client.cancelQueries({ queryKey: HABITS_KEY });
      const previous = client.getQueryData<Data>(HABITS_KEY);
      if (previous) {
        const checks = new Map(previous.checks);
        const set = new Set(checks.get(habitId) ?? []);
        if (done) set.add(date);
        else set.delete(date);
        checks.set(habitId, set);
        client.setQueryData<Data>(HABITS_KEY, { ...previous, checks });
      }
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) client.setQueryData(HABITS_KEY, context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: HABITS_KEY }),
  });
}

export type HabitInput = {
  name: string;
  schedule: HabitSchedule;
  weekdays: number[];
  timesPerWeek: number | null;
  /** "HH:mm", or null for no reminder. */
  remindTime: string | null;
};

export function useSaveHabit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: HabitInput }) => {
      const fields = {
        name: input.name,
        schedule: input.schedule,
        weekdays: input.schedule === "weekdays" ? input.weekdays : [],
        times_per_week: input.schedule === "times_per_week" ? input.timesPerWeek : null,
        remind_time: input.remindTime,
      };
      const { error } = id
        ? await supabase.from("habits").update(fields).eq("id", id)
        : await supabase.from("habits").insert(fields);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: HABITS_KEY }),
  });
}

/** Archiving keeps the history and stops reminders. */
export function useArchiveHabit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: HABITS_KEY }),
  });
}

export function useDeleteHabit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: HABITS_KEY }),
  });
}

/** Reminder times to pick from: 5:00 AM to 10:00 PM, every half hour. */
export const REMIND_TIMES = Array.from({ length: 35 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
  return { value, label: format(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60), "h:mm a") };
});

export function timeLabel(time: string | null): string {
  if (!time) return "No reminder";
  const [h, m] = time.split(":").map(Number);
  return format(new Date(2000, 0, 1, h, m), "h:mm a");
}
