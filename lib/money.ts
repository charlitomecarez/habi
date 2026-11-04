import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, differenceInCalendarDays, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/types/database";

export type TransactionKind = Enums<"transaction_kind">;
export type BillingCycle = Enums<"billing_cycle">;
export type CategoryKind = Enums<"money_category_kind">;
export type SubscriptionKind = Enums<"subscription_kind">;

export type Account = Pick<
  Tables<"money_accounts">,
  "id" | "name" | "kind" | "opening_balance" | "currency" | "sort_order"
> & {
  balance: number;
};

export type Category = Pick<Tables<"money_categories">, "id" | "name" | "kind" | "sort_order">;

export type Transaction = Pick<
  Tables<"transactions">,
  | "id"
  | "kind"
  | "account_id"
  | "to_account_id"
  | "category_id"
  | "subscription_id"
  | "amount"
  | "occurred_on"
  | "merchant"
  | "note"
>;

export type Subscription = Pick<
  Tables<"subscriptions">,
  | "id"
  | "name"
  | "amount"
  | "currency"
  | "billing_cycle"
  | "next_billing_on"
  | "account_id"
  | "category_id"
  | "remind_days_before"
  | "notes"
  | "auto_add"
  | "kind"
> & {
  /** Cost per month in PHP. Null when a foreign currency has no rate yet. */
  monthlyPhp: number | null;
  /** PHP for one unit of the subscription's currency (1 for PHP). Null when no rate is set. */
  rateToPhp: number | null;
};

export type ExchangeRate = { currency: string; rateToPhp: number; updatedAt: string };

/** The currencies a subscription can be billed in. */
export const CURRENCIES = ["PHP", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CYCLE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const satisfies readonly { value: BillingCycle; label: string }[];

/** A subscription renews "soon" within this many days. */
export const RENEWING_SOON_DAYS = 14;
/** The Money tab lists subscriptions that renew within this many days. */
export const RENEWAL_LIST_DAYS = 30;
const RECENT_LIMIT = 10;
const HISTORY_LIMIT = 200;

const MONEY_KEY = ["money"] as const;
const ACCOUNTS_KEY = [...MONEY_KEY, "accounts"] as const;
const CATEGORIES_KEY = [...MONEY_KEY, "categories"] as const;
const SUBSCRIPTIONS_KEY = [...MONEY_KEY, "subscriptions"] as const;
const RATES_KEY = [...MONEY_KEY, "rates"] as const;
const transactionsKey = (limit: number) => [...MONEY_KEY, "transactions", limit] as const;
const monthKey = (month: string) => [...MONEY_KEY, "month", month] as const;
const monthTransactionsKey = (month: string) => [...MONEY_KEY, "month-transactions", month] as const;

const TRANSACTION_COLUMNS =
  "id, kind, account_id, to_account_id, category_id, subscription_id, amount, occurred_on, merchant, note";

function formatNumber(value: number): string {
  return Math.abs(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "₱1,234.50", or "−₱1,234.50" for a negative value. */
export function formatPeso(value: number): string {
  return `${value < 0 ? "−" : ""}₱${formatNumber(value)}`;
}

/** A short amount for a calendar day: "850", "1.2k", "12k", "1.3M". No peso sign, to fit the cell. */
export function compactAmount(value: number): string {
  const v = Math.abs(value);
  if (v < 1000) return String(Math.round(v));
  if (v < 10_000) return `${(Math.floor(v / 100) / 10).toString()}k`;
  if (v < 1_000_000) return `${Math.floor(v / 1000)}k`;
  return `${(Math.floor(v / 100_000) / 10).toString()}M`;
}

/** "USD 9.99" for a foreign currency, "₱9.99" for PHP. */
export function formatMoney(value: number, currency: string): string {
  return currency === "PHP" ? formatPeso(value) : `${currency} ${formatNumber(value)}`;
}

/** "1,234.5" or "1234.50" to 1234.5; null when it is not a positive amount with at most two decimals. */
export function parseAmount(text: string): number | null {
  const clean = text.replace(/[,\s₱]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const value = Number(clean);
  return value > 0 ? value : null;
}

/** Like parseAmount, but zero and negative values are allowed (for an opening balance). */
export function parseBalance(text: string): number | null {
  const clean = text.replace(/[,\s₱]/g, "").replace("−", "-");
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Number(clean);
}

/** An amount as editable text, e.g. 1234.5 to "1234.50". */
export function amountText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : value.toFixed(2);
}

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function cycleLabel(cycle: BillingCycle): string {
  return CYCLE_OPTIONS.find((o) => o.value === cycle)?.label ?? cycle;
}

/** Days until a subscription renews; negative when the date has passed. */
export function daysUntil(dateString: string, now = new Date()): number {
  return differenceInCalendarDays(parseISO(dateString), now);
}

/** The renewal line for a subscription. It always contains a word, not colour only. */
export function renewalText(
  nextBillingOn: string,
  now = new Date(),
): { text: string; status: "overdue" | "today" | "soon" | "later" } {
  const days = daysUntil(nextBillingOn, now);
  const date = format(parseISO(nextBillingOn), "MMM d");
  if (days < 0) return { text: `Renewed ${date}, not logged`, status: "overdue" };
  if (days === 0) return { text: "Renews today", status: "today" };
  if (days <= RENEWING_SOON_DAYS)
    return { text: `Renews ${date} · in ${days} ${days === 1 ? "day" : "days"}`, status: "soon" };
  return { text: `Renews ${date}`, status: "later" };
}

/** Accounts that are not archived, with their balance. */
export function useAccounts() {
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async (): Promise<Account[]> => {
      const [accounts, balances] = await Promise.all([
        supabase
          .from("money_accounts")
          .select("id, name, kind, opening_balance, currency, sort_order")
          .eq("is_archived", false)
          .order("sort_order")
          .order("name"),
        supabase.from("money_account_balances").select("account_id, balance").eq("is_archived", false),
      ]);
      if (accounts.error) throw accounts.error;
      if (balances.error) throw balances.error;
      const balanceById = new Map(balances.data.map((b) => [b.account_id, b.balance ?? 0]));
      return accounts.data.map((a) => ({ ...a, balance: balanceById.get(a.id) ?? a.opening_balance }));
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("money_categories")
        .select("id, name, kind, sort_order")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

/** The newest transactions, newest first. */
export function useTransactions(limit: "recent" | "history" = "recent") {
  const count = limit === "recent" ? RECENT_LIMIT : HISTORY_LIMIT;
  return useQuery({
    queryKey: transactionsKey(count),
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select(TRANSACTION_COLUMNS)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(count);
      if (error) throw error;
      return data;
    },
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: [...MONEY_KEY, "transaction", id],
    queryFn: async (): Promise<Transaction | null> => {
      const { data, error } = await supabase
        .from("transactions")
        .select(TRANSACTION_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type MonthSummary = {
  spent: number;
  income: number;
  /** Expense total per category id ("none" for no category), largest first. */
  byCategory: { categoryId: string | null; total: number }[];
};

/** Spending and income in the calendar month that contains `now`. Transfers do not count. */
export function useMonthSummary(now = new Date()) {
  const start = startOfMonth(now);
  const month = toDateString(start);
  return useQuery({
    queryKey: monthKey(month),
    queryFn: async (): Promise<MonthSummary> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("kind, amount, category_id")
        .in("kind", ["expense", "income"])
        .gte("occurred_on", month)
        .lt("occurred_on", toDateString(addMonths(start, 1)));
      if (error) throw error;

      const totals = new Map<string | null, number>();
      let spent = 0;
      let income = 0;
      for (const t of data) {
        if (t.kind === "income") {
          income += t.amount;
        } else {
          spent += t.amount;
          totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount);
        }
      }
      const byCategory = [...totals]
        .map(([categoryId, total]) => ({ categoryId, total }))
        .sort((a, b) => b.total - a.total);
      return { spent, income, byCategory };
    },
  });
}

/** Every transaction in the calendar month that contains `month`, by date, newest first within a day. */
export function useMonthTransactions(month: Date) {
  const start = startOfMonth(month);
  const from = toDateString(start);
  return useQuery({
    queryKey: monthTransactionsKey(from),
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select(TRANSACTION_COLUMNS)
        .gte("occurred_on", from)
        .lt("occurred_on", toDateString(addMonths(start, 1)))
        .order("occurred_on")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    // Keep the last month on screen while the next one loads, so the calendar does not flash.
    placeholderData: keepPreviousData,
  });
}

export type DayTotals = { spent: number; income: number };

/**
 * Spending and income per day ("yyyy-MM-dd") and for the whole list. Transfers do not count,
 * the same as the month summary.
 */
export function dayTotals(transactions: Pick<Transaction, "kind" | "amount" | "occurred_on">[]): {
  byDay: Map<string, DayTotals>;
  spent: number;
  income: number;
} {
  const byDay = new Map<string, DayTotals>();
  let spent = 0;
  let income = 0;
  for (const t of transactions) {
    if (t.kind === "transfer") continue;
    const day = byDay.get(t.occurred_on) ?? { spent: 0, income: 0 };
    if (t.kind === "income") {
      day.income += t.amount;
      income += t.amount;
    } else {
      day.spent += t.amount;
      spent += t.amount;
    }
    byDay.set(t.occurred_on, day);
  }
  return { byDay, spent, income };
}

/** Active subscriptions, soonest renewal first. */
export function useSubscriptions() {
  return useQuery({
    queryKey: SUBSCRIPTIONS_KEY,
    queryFn: async (): Promise<Subscription[]> => {
      const { data, error } = await supabase
        .from("subscription_costs")
        .select(
          "id, name, amount, currency, billing_cycle, next_billing_on, account_id, category_id, remind_days_before, notes, auto_add, kind, monthly_php, rate_to_php",
        )
        .eq("is_active", true)
        .order("next_billing_on");
      if (error) throw error;
      // The view marks every column nullable; these come from not-null table columns.
      return data.map((s) => ({
        id: s.id!,
        name: s.name!,
        amount: s.amount,
        currency: s.currency!,
        billing_cycle: s.billing_cycle!,
        next_billing_on: s.next_billing_on!,
        account_id: s.account_id,
        category_id: s.category_id,
        remind_days_before: s.remind_days_before!,
        notes: s.notes,
        auto_add: s.auto_add!,
        kind: s.kind!,
        monthlyPhp: s.monthly_php,
        rateToPhp: s.rate_to_php,
      }));
    },
  });
}

export function useSubscription(id: string) {
  const subscriptions = useSubscriptions();
  return { ...subscriptions, data: subscriptions.data?.find((s) => s.id === id) };
}

export function useExchangeRates() {
  return useQuery({
    queryKey: RATES_KEY,
    queryFn: async (): Promise<ExchangeRate[]> => {
      const { data, error } = await supabase.from("exchange_rates").select("currency, rate_to_php, updated_at");
      if (error) throw error;
      return data.map((r) => ({ currency: r.currency, rateToPhp: r.rate_to_php, updatedAt: r.updated_at }));
    },
  });
}

function useInvalidateMoney() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: MONEY_KEY });
}

export type TransactionInput = {
  kind: TransactionKind;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  subscriptionId: string | null;
  occurredOn: Date;
  merchant: string | null;
  note: string | null;
};

export function useSaveTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TransactionInput }) => {
      const transfer = input.kind === "transfer";
      const fields = {
        kind: input.kind,
        amount: input.amount,
        account_id: input.accountId,
        to_account_id: transfer ? input.toAccountId : null,
        category_id: transfer ? null : input.categoryId,
        subscription_id: input.kind === "expense" ? input.subscriptionId : null,
        occurred_on: toDateString(input.occurredOn),
        merchant: transfer ? null : input.merchant,
        note: input.note,
      };
      const { error } = id
        ? await supabase.from("transactions").update(fields).eq("id", id)
        : await supabase.from("transactions").insert(fields);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useSaveAccount() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ id, name, openingBalance }: { id?: string; name: string; openingBalance: number }) => {
      const fields = { name, opening_balance: openingBalance };
      const { error } = id
        ? await supabase.from("money_accounts").update(fields).eq("id", id)
        : await supabase.from("money_accounts").insert({ ...fields, sort_order: 100 });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export type SubscriptionInput = {
  name: string;
  /** Null for a bill, whose amount changes each time. */
  amount: number | null;
  kind: SubscriptionKind;
  currency: Currency;
  billingCycle: BillingCycle;
  nextBillingOn: Date;
  accountId: string | null;
  categoryId: string | null;
  remindDaysBefore: number;
  notes: string | null;
  /** Add the expense to the account on each billing day. Needs an account. */
  autoAdd: boolean;
};

export function useSaveSubscription() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: SubscriptionInput }) => {
      const fields = {
        name: input.name,
        amount: input.amount,
        currency: input.currency,
        billing_cycle: input.billingCycle,
        next_billing_on: toDateString(input.nextBillingOn),
        account_id: input.accountId,
        category_id: input.categoryId,
        remind_days_before: input.remindDaysBefore,
        notes: input.notes,
        auto_add: input.kind === "bill" ? false : input.autoAdd,
        kind: input.kind,
      };
      const { error } = id
        ? await supabase.from("subscriptions").update(fields).eq("id", id)
        : await supabase.from("subscriptions").insert(fields);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Deleting a subscription also removes its pending renewal reminder (database trigger). */
export function useDeleteSubscription() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useSaveExchangeRate() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ currency, rateToPhp }: { currency: string; rateToPhp: number }) => {
      const { error } = await supabase
        .from("exchange_rates")
        .upsert({ currency, rate_to_php: rateToPhp, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}
