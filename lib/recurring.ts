import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, getDate, getDay, getDaysInMonth, parseISO } from "date-fns";

import { MONEY_KEY, toDateString } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type Recurring = Tables<"recurring_transactions">;
export type Schedule = "daily" | "weekdays" | "weekends" | "weekly" | "monthly";
type Rule = Pick<Recurring, "schedule" | "week_days" | "month_day">;

export const SCHEDULES: readonly { value: Schedule; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

/** 0 is Sunday, as in the table. */
export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The same rule as recurring_is_due in SQL. A short month uses its last day. */
export function isDueOn(rule: Rule, date: Date): boolean {
  const day = getDay(date);
  switch (rule.schedule) {
    case "daily":
      return true;
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekends":
      return day === 0 || day === 6;
    case "weekly":
      return (rule.week_days ?? []).includes(day);
    case "monthly":
      return getDate(date) === Math.min(rule.month_day ?? 1, getDaysInMonth(date));
    default:
      return false;
  }
}

/** The next day this rule saves a row, from `from`. Null when it has ended. */
export function nextDate(
  rule: Rule & Pick<Recurring, "starts_on" | "ends_on" | "last_run_on">,
  from: Date,
): string | null {
  const start = parseISO(rule.starts_on);
  const last = rule.last_run_on ? addDays(parseISO(rule.last_run_on), 1) : start;
  let day = [from, start, last].reduce((a, b) => (a > b ? a : b));
  // Two months always holds a due day.
  for (let i = 0; i < 62; i++) {
    const text = toDateString(day);
    if (rule.ends_on && text > rule.ends_on) return null;
    if (isDueOn(rule, day)) return text;
    day = addDays(day, 1);
  }
  return null;
}

export function scheduleText(rule: Rule): string {
  if (rule.schedule === "weekly") {
    const days = [...(rule.week_days ?? [])].sort((a, b) => a - b).map((d) => WEEK_DAYS[d]);
    return `Weekly on ${days.join(", ")}`;
  }
  if (rule.schedule === "monthly") return `Monthly on day ${rule.month_day}`;
  return SCHEDULES.find((s) => s.value === rule.schedule)?.label ?? "";
}

/** About how much a rule moves in a month, for the list header. */
export function monthlyAmount(rule: Rule & Pick<Recurring, "amount">): number {
  const perWeek: Record<string, number> = {
    daily: 7,
    weekdays: 5,
    weekends: 2,
    weekly: rule.week_days?.length ?? 0,
  };
  if (rule.schedule === "monthly") return rule.amount;
  return Math.round(rule.amount * (perWeek[rule.schedule] ?? 0) * (52 / 12));
}

export function nextText(date: string | null, today: Date): string {
  if (!date) return "Ended";
  if (date === toDateString(today)) return "Next: Today";
  return `Next: ${format(parseISO(date), "EEE, MMM d")}`;
}

/** A row that a recurring rule saved. The ref stays after the rule is deleted. */
export const isAutoRow = (externalRef: string | null) => externalRef?.startsWith("recurring:") ?? false;

const RECURRING_KEY = [...MONEY_KEY, "recurring"] as const;

function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: MONEY_KEY });
}

export function useRecurring() {
  return useQuery({
    queryKey: RECURRING_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .order("is_paused")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

/** The rows that this rule saved, newest first, for the rule screen. */
export function useRecurringRows(id: string) {
  return useQuery({
    queryKey: [...RECURRING_KEY, "rows", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, occurred_on")
        .like("external_ref", `recurring:${id}:%`)
        .order("occurred_on", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data;
    },
  });
}

export type RecurringInput = Pick<
  Recurring,
  | "kind"
  | "name"
  | "amount"
  | "account_id"
  | "category_id"
  | "schedule"
  | "week_days"
  | "month_day"
  | "starts_on"
  | "ends_on"
>;

export function useSaveRecurring() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: RecurringInput }) => {
      const { error } = id
        ? await supabase.from("recurring_transactions").update(input).eq("id", id)
        : await supabase.from("recurring_transactions").insert(input);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useSetRecurringPaused() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, paused }: { id: string; paused: boolean }) => {
      const { error } = await supabase.from("recurring_transactions").update({ is_paused: paused }).eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteRecurring() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}
