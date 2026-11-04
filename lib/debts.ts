import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, format, parseISO } from "date-fns";

import { formatPeso, toDateString } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/types/database";

export type DebtDirection = Enums<"debt_direction">;

export type Debt = Omit<Tables<"debts">, "user_id" | "updated_at"> & { paid: number; balance: number };
export type DebtPayment = Omit<Tables<"debt_payments">, "user_id">;

const DEBTS_KEY = ["debts"] as const;

export const DIRECTION_OPTIONS = [
  { value: "owed_to_me", label: "They owe you" },
  { value: "i_owe", label: "You owe" },
] as const satisfies readonly { value: DebtDirection; label: string }[];

/** Every debt with what is left. Paid ones too, so the history stays. */
export function useDebts() {
  return useQuery({
    queryKey: DEBTS_KEY,
    queryFn: async (): Promise<Debt[]> => {
      const [debts, balances] = await Promise.all([
        supabase
          .from("debts")
          .select("id, person_name, person_id, direction, amount, occurred_on, due_on, note, created_at")
          .order("occurred_on", { ascending: false }),
        supabase.from("debt_balances").select("debt_id, paid, balance"),
      ]);
      if (debts.error) throw debts.error;
      if (balances.error) throw balances.error;
      const byId = new Map(balances.data.map((b) => [b.debt_id, b]));
      return debts.data.map((d) => ({
        ...d,
        paid: byId.get(d.id)?.paid ?? 0,
        balance: byId.get(d.id)?.balance ?? d.amount,
      }));
    },
  });
}

export function useDebt(id: string) {
  const debts = useDebts();
  return { ...debts, data: debts.data?.find((d) => d.id === id) };
}

export function useDebtPayments(debtId: string) {
  return useQuery({
    queryKey: [...DEBTS_KEY, "payments", debtId],
    queryFn: async (): Promise<DebtPayment[]> => {
      const { data, error } = await supabase
        .from("debt_payments")
        .select("id, debt_id, amount, paid_on, account_id, transaction_id, created_at")
        .eq("debt_id", debtId)
        .order("paid_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidate() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: DEBTS_KEY });
    // Payments add and remove Money transactions.
    client.invalidateQueries({ queryKey: ["money"] });
  };
}

export type DebtInput = {
  personName: string;
  direction: DebtDirection;
  amount: number;
  occurredOn: Date;
  dueOn: Date | null;
  note: string | null;
};

export function useSaveDebt() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: DebtInput }) => {
      const fields = {
        person_name: input.personName,
        direction: input.direction,
        amount: input.amount,
        occurred_on: toDateString(input.occurredOn),
        due_on: input.dueOn ? toDateString(input.dueOn) : null,
        note: input.note,
      };
      const { error } = id
        ? await supabase.from("debts").update(fields).eq("id", id)
        : await supabase.from("debts").insert(fields);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Deleting a debt deletes its payments. Their Money transactions are deleted too. */
export function useDeleteDebt() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("debts").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Records a payment and adds its Money transaction in one step. */
export function useRecordPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (p: { debtId: string; amount: number; paidOn: Date; accountId: string }) => {
      const { error } = await supabase.rpc("record_debt_payment", {
        p_debt_id: p.debtId,
        p_amount: p.amount,
        p_paid_on: toDateString(p.paidOn),
        p_account_id: p.accountId,
      });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Deleting a payment also deletes its Money transaction (database trigger). */
export function useDeletePayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("debt_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** The status line for a debt, always with a word: Paid, Overdue, Due today, Due Nov 4. */
export function debtStatus(d: Pick<Debt, "balance" | "due_on">, now = new Date()) {
  if (d.balance <= 0) return { text: "Paid", tone: "neutral" as const };
  if (!d.due_on) return { text: `${formatPeso(d.balance)} left`, tone: "neutral" as const };
  const days = differenceInCalendarDays(parseISO(d.due_on), now);
  const date = format(parseISO(d.due_on), "MMM d");
  if (days < 0) return { text: `Overdue · was due ${date}`, tone: "danger" as const };
  if (days === 0) return { text: "Due today", tone: "warning" as const };
  if (days <= 7) return { text: `Due ${date}`, tone: "warning" as const };
  return { text: `Due ${date}`, tone: "neutral" as const };
}
