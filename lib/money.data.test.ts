import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useAccounts,
  useCategories,
  useDeleteSubscription,
  useDeleteTransaction,
  useExchangeRates,
  useExpenseNames,
  useMonthSummary,
  useMonthTransactions,
  useSaveAccount,
  useSaveExchangeRate,
  useSaveSubscription,
  useSaveTransaction,
  useSubscription,
  useSubscriptions,
  useTransaction,
  useTransactions,
  type TransactionInput,
} from "@/lib/money";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

const fail = { data: null, error: new Error("down") };

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

const expense: TransactionInput = {
  kind: "expense",
  amount: 120,
  accountId: "a1",
  toAccountId: "a2",
  categoryId: "c1",
  subscriptionId: "s1",
  occurredOn: new Date(2026, 10, 3),
  merchant: "Jollibee",
  note: null,
};

describe("money reads", () => {
  it("joins each account with its balance, or its opening balance", async () => {
    respond(
      {
        data: [
          { id: "a1", opening_balance: 50 },
          { id: "a2", opening_balance: 10 },
        ],
      },
      { data: [{ account_id: "a1", balance: 75 }] },
    );
    const rows = (await runQuery(useAccounts())) as { balance: number }[];
    expect(rows.map((r) => r.balance)).toEqual([75, 10]);
    respond(fail, { data: [] });
    await expect(runQuery(useAccounts())).rejects.toThrow("down");
    respond({ data: [] }, fail);
    await expect(runQuery(useAccounts())).rejects.toThrow("down");
  });

  it("reads categories, transactions and one transaction", async () => {
    respond({ data: [{ id: "c1" }] }, { data: [{ id: "t1" }] }, { data: [{ id: "t2" }] }, { data: { id: "t1" } });
    expect(await runQuery(useCategories())).toEqual([{ id: "c1" }]);
    await runQuery(useTransactions());
    await runQuery(useTransactions("history"));
    expect(await runQuery(useTransaction("t1"))).toEqual({ id: "t1" });
    expect(targets()).toEqual(["money_categories", "transactions", "transactions", "transactions"]);
    for (const hook of [useCategories(), useTransactions(), useTransaction("x")]) {
      respond(fail);
      await expect(runQuery(hook)).rejects.toThrow("down");
    }
  });

  it("sums the month by category, largest first", async () => {
    respond({
      data: [
        { kind: "expense", amount: 100, category_id: "food" },
        { kind: "expense", amount: 300, category_id: "rent" },
        { kind: "expense", amount: 50, category_id: "food" },
        { kind: "income", amount: 1000, category_id: null },
      ],
    });
    expect(await runQuery(useMonthSummary(new Date(2026, 10, 15)))).toEqual({
      spent: 450,
      income: 1000,
      byCategory: [
        { categoryId: "rent", total: 300 },
        { categoryId: "food", total: 150 },
      ],
    });
    expect(argsOf("gte")[0]).toEqual(["occurred_on", "2026-11-01"]);
    respond(fail);
    await expect(runQuery(useMonthSummary())).rejects.toThrow("down");
  });

  it("reads a month of transactions without a home summary", async () => {
    respond({ data: [{ id: "t1" }] });
    expect(await runQuery(useMonthTransactions(new Date(2026, 1, 10)))).toEqual([{ id: "t1" }]);
    expect(argsOf("lt")[0]).toEqual(["occurred_on", "2026-03-01"]);
    respond(fail);
    await expect(runQuery(useMonthTransactions(new Date()))).rejects.toThrow("down");
  });

  it("maps subscriptions from the cost view", async () => {
    respond({ data: [{ id: "s1", name: "Netflix", amount: 549, monthly_php: 549, rate_to_php: 1 }] });
    const [s] = (await runQuery(useSubscriptions())) as { monthlyPhp: number; rateToPhp: number }[];
    expect(s).toMatchObject({ monthlyPhp: 549, rateToPhp: 1 });
    expect(useSubscription("s1").data).toBeUndefined();
    respond(fail);
    await expect(runQuery(useSubscriptions())).rejects.toThrow("down");
  });

  it("maps exchange rates and expense names", async () => {
    respond(
      { data: [{ currency: "USD", rate_to_php: 58, updated_at: "x" }] },
      {
        data: [
          { merchant: "Grab", category_id: null },
          { merchant: null, category_id: "c" },
        ],
      },
    );
    expect(await runQuery(useExchangeRates())).toEqual([{ currency: "USD", rateToPhp: 58, updatedAt: "x" }]);
    expect(await runQuery(useExpenseNames())).toEqual([
      { name: "Grab", categoryId: null },
      { name: "", categoryId: "c" },
    ]);
    for (const hook of [useExchangeRates(), useExpenseNames()]) {
      respond(fail);
      await expect(runQuery(hook)).rejects.toThrow("down");
    }
  });
});

describe("money writes", () => {
  it("inserts an expense and keeps its subscription and merchant", async () => {
    await runMutation(useSaveTransaction(), { input: expense });
    expect(argsOf("insert")[0][0]).toMatchObject({
      to_account_id: null,
      category_id: "c1",
      subscription_id: "s1",
      merchant: "Jollibee",
      occurred_on: "2026-11-03",
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });

  it("updates a transfer with no category, merchant or subscription", async () => {
    await runMutation(useSaveTransaction(), { id: "t1", input: { ...expense, kind: "transfer" } });
    expect(argsOf("update")[0][0]).toMatchObject({
      to_account_id: "a2",
      category_id: null,
      subscription_id: null,
      merchant: null,
    });
    expect(argsOf("eq")).toEqual([["id", "t1"]]);
    respond(fail);
    await expect(runMutation(useSaveTransaction(), { input: expense })).rejects.toThrow("down");
  });

  it("saves accounts, subscriptions and rates, and deletes rows", async () => {
    await runMutation(useSaveAccount(), { name: "GCash", openingBalance: 5 });
    await runMutation(useSaveAccount(), { id: "a1", name: "GCash", openingBalance: 6 });
    const sub = {
      name: "Meralco",
      amount: null,
      kind: "bill" as const,
      currency: "PHP" as const,
      billingCycle: "monthly" as const,
      nextBillingOn: new Date(2026, 10, 20),
      accountId: "a1",
      categoryId: null,
      remindDaysBefore: 3,
      notes: null,
      autoAdd: true,
    };
    await runMutation(useSaveSubscription(), { input: sub });
    await runMutation(useSaveSubscription(), { id: "s1", input: { ...sub, kind: "subscription" as const } });
    await runMutation(useSaveExchangeRate(), { currency: "USD", rateToPhp: 58 });
    await runMutation(useDeleteTransaction(), "t1");
    await runMutation(useDeleteSubscription(), "s1");
    expect(argsOf("insert")[0][0]).toEqual({ name: "GCash", opening_balance: 5, sort_order: 100 });
    expect(argsOf("insert")[1][0]).toMatchObject({ auto_add: false, next_billing_on: "2026-11-20" });
    expect(argsOf("update")[1][0]).toMatchObject({ auto_add: true });
    expect(argsOf("upsert")[0][0]).toMatchObject({ currency: "USD", rate_to_php: 58 });
    expect(targets()).toEqual([
      "money_accounts",
      "money_accounts",
      "subscriptions",
      "subscriptions",
      "exchange_rates",
      "transactions",
      "subscriptions",
    ]);
  });

  it("throws each write error", async () => {
    const writes: [unknown, unknown][] = [
      [useSaveAccount(), { name: "x", openingBalance: 0 }],
      [useSaveExchangeRate(), { currency: "USD", rateToPhp: 1 }],
      [useDeleteTransaction(), "t"],
      [useDeleteSubscription(), "s"],
    ];
    for (const [hook, input] of writes) {
      respond(fail);
      await expect(runMutation(hook, input)).rejects.toThrow("down");
    }
  });
});
