import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarMonths, parseISO, startOfMonth } from "date-fns";

import { toDateString } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type Goal = Pick<Tables<"savings_goals">, "id" | "name" | "target_amount" | "target_date" | "account_id">;
export type Contribution = Pick<Tables<"savings_contributions">, "id" | "goal_id" | "amount" | "on_date" | "note">;
export type GoalProgress = Goal & {
  saved: number;
  left: number;
  reached: boolean;
  perMonth: number | null;
  monthsLeft: number | null;
};

const KEY = ["money", "goals"] as const;

/** How much is saved, what is left and how much to save each month to reach the date. */
export function goalProgress(goal: Goal, contributions: Contribution[], now = new Date()): GoalProgress {
  const saved = contributions.filter((c) => c.goal_id === goal.id).reduce((s, c) => s + c.amount, 0);
  const left = Math.max(0, goal.target_amount - saved);
  const reached = saved >= goal.target_amount;
  let monthsLeft: number | null = null;
  let perMonth: number | null = null;
  if (goal.target_date && !reached) {
    // This month counts, so a goal due later this month needs the full amount now.
    monthsLeft = Math.max(
      1,
      differenceInCalendarMonths(startOfMonth(parseISO(goal.target_date)), startOfMonth(now)) + 1,
    );
    perMonth = Math.ceil(left / monthsLeft);
  }
  return { ...goal, saved, left, reached, perMonth, monthsLeft };
}

export function useGoals() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [goals, contributions] = await Promise.all([
        supabase.from("savings_goals").select("id, name, target_amount, target_date, account_id").order("created_at"),
        supabase
          .from("savings_contributions")
          .select("id, goal_id, amount, on_date, note")
          .order("on_date", { ascending: false }),
      ]);
      if (goals.error) throw goals.error;
      if (contributions.error) throw contributions.error;
      const list = contributions.data as Contribution[];
      return { goals: (goals.data as Goal[]).map((g) => goalProgress(g, list)), contributions: list };
    },
  });
}

function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: KEY });
}

export function useSaveGoal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (g: {
      id?: string;
      name: string;
      target: number;
      targetDate: Date | null;
      accountId: string | null;
    }) => {
      const fields = {
        name: g.name,
        target_amount: g.target,
        target_date: g.targetDate ? toDateString(g.targetDate) : null,
        account_id: g.accountId,
      };
      const { error } = g.id
        ? await supabase.from("savings_goals").update(fields).eq("id", g.id)
        : await supabase.from("savings_goals").insert(fields);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** A positive amount adds to the goal; a negative one takes money out. */
export function useAddContribution() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (c: { goalId: string; amount: number; on: Date; note: string | null }) => {
      const { error } = await supabase
        .from("savings_contributions")
        .insert({ goal_id: c.goalId, amount: c.amount, on_date: toDateString(c.on), note: c.note });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteContribution() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_contributions").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}
