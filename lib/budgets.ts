import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, format, isBefore, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type Budget = Pick<Tables<"money_budgets">, "id" | "category_id" | "monthly_limit" | "starts_on">;

export type BudgetMonth = {
  budget: Budget;
  /** This month's limit plus what carried over. */
  available: number;
  spent: number;
  /** Unspent money from earlier months. Overspending never carries. */
  carried: number;
  /** The month the carried money mostly comes from, e.g. "October". */
  carriedFrom: string | null;
  left: number;
};

const KEY = ["money", "budgets"] as const;
const monthKey = (d: Date) => format(d, "yyyy-MM");

/**
 * The same rule as budget_month() in the database: unspent money carries to the next month,
 * overspending does not. Worked out from monthly totals, so an edited old expense fixes it.
 */
export function budgetMonth(budget: Budget, spentByMonth: Map<string, number>, month: Date): BudgetMonth {
  const target = startOfMonth(month);
  let m = startOfMonth(parseISO(budget.starts_on));
  let carry = 0;
  let carriedFrom: string | null = null;
  while (isBefore(m, target)) {
    const spent = spentByMonth.get(monthKey(m)) ?? 0;
    const next = Math.max(0, budget.monthly_limit + carry - spent);
    carriedFrom = next > 0 ? format(m, "MMMM") : null;
    carry = next;
    m = addMonths(m, 1);
  }
  if (isBefore(target, startOfMonth(parseISO(budget.starts_on)))) carry = 0;
  const spent = spentByMonth.get(monthKey(target)) ?? 0;
  const available = budget.monthly_limit + carry;
  return {
    budget,
    available,
    spent,
    carried: carry,
    carriedFrom: carry > 0 ? carriedFrom : null,
    left: available - spent,
  };
}

/** Budgets with what is spent each month in their categories since the earliest budget started. */
export function useBudgets() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const budgets = await supabase.from("money_budgets").select("id, category_id, monthly_limit, starts_on");
      if (budgets.error) throw budgets.error;
      const list = budgets.data as Budget[];
      const spent = new Map<string, Map<string, number>>();
      if (list.length) {
        const since = list.map((b) => b.starts_on).sort()[0];
        const tx = await supabase
          .from("transactions")
          .select("category_id, amount, occurred_on")
          .eq("kind", "expense")
          .in(
            "category_id",
            list.map((b) => b.category_id),
          )
          .gte("occurred_on", since);
        if (tx.error) throw tx.error;
        for (const t of tx.data) {
          if (!t.category_id) continue;
          const byMonth = spent.get(t.category_id) ?? new Map<string, number>();
          const k = t.occurred_on.slice(0, 7);
          byMonth.set(k, (byMonth.get(k) ?? 0) + t.amount);
          spent.set(t.category_id, byMonth);
        }
      }
      return { budgets: list, spent };
    },
  });
}

export function useBudgetMonths(month = new Date()): BudgetMonth[] | undefined {
  const { data } = useBudgets();
  return data?.budgets.map((b) => budgetMonth(b, data.spent.get(b.category_id) ?? new Map(), month));
}

export function useSaveBudget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, categoryId, limit }: { id?: string; categoryId: string; limit: number }) => {
      const { error } = id
        ? await supabase.from("money_budgets").update({ category_id: categoryId, monthly_limit: limit }).eq("id", id)
        : await supabase.from("money_budgets").insert({ category_id: categoryId, monthly_limit: limit });
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteBudget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("money_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
