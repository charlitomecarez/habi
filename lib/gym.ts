import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, getDay, startOfDay, subDays } from "date-fns";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type Plan = Omit<Tables<"workout_plans">, "user_id" | "updated_at">;
export type Exercise = Omit<Tables<"workout_exercises">, "user_id" | "created_at">;
export type Session = Omit<Tables<"workout_sessions">, "user_id">;
export type WorkoutSet = Omit<Tables<"workout_sets">, "user_id">;

const GYM_KEY = ["gym"] as const;
const SESSION_DAYS = 400;

export const today = () => format(new Date(), "yyyy-MM-dd");

/** "3 × 10 · 20 kg" */
export function setsText(sets: number, reps: number, weight: number | null): string {
  return `${sets} × ${reps}${weight ? ` · ${formatKg(weight)}` : ""}`;
}

export function formatKg(kg: number): string {
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
}

export function isGymDay(plan: Pick<Plan, "weekdays">, date: Date): boolean {
  return plan.weekdays.includes(getDay(date));
}

/** Plans with their exercises, and sessions from the last SESSION_DAYS days. */
export function useGym() {
  return useQuery({
    queryKey: GYM_KEY,
    queryFn: async () => {
      const since = format(subDays(new Date(), SESSION_DAYS), "yyyy-MM-dd");
      const [plans, exercises, sessions] = await Promise.all([
        supabase
          .from("workout_plans")
          .select("id, name, weekdays, remind_time, sort_order, archived, created_at")
          .eq("archived", false)
          .order("sort_order")
          .order("created_at"),
        supabase
          .from("workout_exercises")
          .select("id, plan_id, name, sets, reps, weight_kg, sort_order")
          .order("sort_order"),
        supabase
          .from("workout_sessions")
          .select("id, plan_id, plan_name, on_date, created_at")
          .gte("on_date", since)
          .order("on_date", { ascending: false }),
      ]);
      if (plans.error) throw plans.error;
      if (exercises.error) throw exercises.error;
      if (sessions.error) throw sessions.error;
      return {
        plans: plans.data as Plan[],
        exercises: exercises.data as Exercise[],
        sessions: sessions.data as Session[],
      };
    },
  });
}

/** Days that are a gym day for some plan, up to today, with whether you trained. */
export function trainedOrMissed(
  plans: Plan[],
  sessions: Session[],
  date: string,
  now = new Date(),
): "trained" | "missed" | null {
  if (sessions.some((s) => s.on_date === date)) return "trained";
  const d = new Date(`${date}T00:00:00`);
  if (d >= startOfDay(now)) return null;
  const due = plans.some((p) => isGymDay(p, d) && d >= startOfDay(new Date(p.created_at)));
  return due ? "missed" : null;
}

export function useSessionSets(sessionId: string | undefined) {
  return useQuery({
    queryKey: [...GYM_KEY, "sets", sessionId],
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<WorkoutSet[]> => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("id, session_id, exercise_id, exercise_name, set_number, reps, weight_kg, created_at")
        .eq("session_id", sessionId!)
        .order("set_number");
      if (error) throw error;
      return data;
    },
  });
}

/** Every set you did for one exercise, newest first, with the session date. */
export function useExerciseHistory(exerciseId: string) {
  return useQuery({
    queryKey: [...GYM_KEY, "history", exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("id, session_id, set_number, reps, weight_kg, created_at")
        .eq("exercise_id", exerciseId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: GYM_KEY });
}

export type ExerciseInput = { id?: string; name: string; sets: number; reps: number; weightKg: number | null };
export type PlanInput = { name: string; weekdays: number[]; remindTime: string | null; exercises: ExerciseInput[] };

/** Saves a plan and its exercises. Exercises left out of the list are deleted; their history stays. */
export function useSavePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input, removedIds }: { id?: string; input: PlanInput; removedIds: string[] }) => {
      const fields = { name: input.name, weekdays: input.weekdays, remind_time: input.remindTime };
      let planId = id;
      if (planId) {
        const { error } = await supabase.from("workout_plans").update(fields).eq("id", planId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("workout_plans").insert(fields).select("id").single();
        if (error) throw error;
        planId = data.id;
      }
      if (removedIds.length) {
        const { error } = await supabase.from("workout_exercises").delete().in("id", removedIds);
        if (error) throw error;
      }
      for (const [i, e] of input.exercises.entries()) {
        const row = { plan_id: planId, name: e.name, sets: e.sets, reps: e.reps, weight_kg: e.weightKg, sort_order: i };
        const { error } = e.id
          ? await supabase.from("workout_exercises").update(row).eq("id", e.id)
          : await supabase.from("workout_exercises").insert(row);
        if (error) throw error;
      }
      return planId;
    },
    onSettled: invalidate,
  });
}

/** Archiving keeps the history and stops the reminders. */
export function useArchivePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_plans").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Today's session for a plan, made on first use. */
export async function ensureSession(plan: Pick<Plan, "id" | "name">, date: string): Promise<string> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .upsert({ plan_id: plan.id, plan_name: plan.name, on_date: date }, { onConflict: "plan_id,on_date" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Ticks a set with the reps and weight you did, or unticks it. */
export function useToggleSet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (s: {
      plan: Pick<Plan, "id" | "name">;
      date: string;
      exercise: Pick<Exercise, "id" | "name">;
      setNumber: number;
      reps: number;
      weightKg: number | null;
      done: boolean;
    }) => {
      const sessionId = await ensureSession(s.plan, s.date);
      const { error } = s.done
        ? await supabase.from("workout_sets").upsert(
            {
              session_id: sessionId,
              exercise_id: s.exercise.id,
              exercise_name: s.exercise.name,
              set_number: s.setNumber,
              reps: s.reps,
              weight_kg: s.weightKg,
            },
            { onConflict: "session_id,exercise_id,set_number" },
          )
        : await supabase
            .from("workout_sets")
            .delete()
            .eq("session_id", sessionId)
            .eq("exercise_id", s.exercise.id)
            .eq("set_number", s.setNumber);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: GYM_KEY }),
  });
}
