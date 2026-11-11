import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBudgetMonths, useBudgets, useDeleteBudget, useSaveBudget } from "@/lib/budgets";
import { runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("budgets data", () => {
  it("sums spending per category and month since the earliest budget", async () => {
    respond(
      {
        data: [
          { id: "b1", category_id: "food", monthly_limit: 5000, starts_on: "2026-10-01" },
          { id: "b2", category_id: "fun", monthly_limit: 1000, starts_on: "2026-09-01" },
        ],
      },
      {
        data: [
          { category_id: "food", amount: 100, occurred_on: "2026-11-02" },
          { category_id: "food", amount: 50, occurred_on: "2026-11-09" },
          { category_id: null, amount: 9, occurred_on: "2026-11-01" },
        ],
      },
    );
    const { spent } = (await runQuery(useBudgets())) as { spent: Map<string, Map<string, number>> };
    expect(spent.get("food")?.get("2026-11")).toBe(150);
    expect(argsOf("gte")).toEqual([["occurred_on", "2026-09-01"]]);
    expect(useBudgetMonths()).toBeUndefined();
  });

  it("skips the spending read with no budget, and throws read errors", async () => {
    respond({ data: [] });
    expect(await runQuery(useBudgets())).toEqual({ budgets: [], spent: new Map() });
    expect(targets()).toEqual(["money_budgets"]);
    respond({ error: new Error("a") });
    await expect(runQuery(useBudgets())).rejects.toThrow("a");
    respond({ data: [{ category_id: "c", starts_on: "2026-01-01" }] }, { error: new Error("b") });
    await expect(runQuery(useBudgets())).rejects.toThrow("b");
  });

  it("saves and deletes a budget", async () => {
    await runMutation(useSaveBudget(), { categoryId: "food", limit: 5000 });
    await runMutation(useSaveBudget(), { id: "b1", categoryId: "food", limit: 6000 });
    await runMutation(useDeleteBudget(), "b1");
    expect(argsOf("insert")[0][0]).toEqual({ category_id: "food", monthly_limit: 5000 });
    expect(argsOf("update")[0][0]).toEqual({ category_id: "food", monthly_limit: 6000 });
    await expectWriteErrors([
      [useSaveBudget(), { categoryId: "c", limit: 1 }],
      [useDeleteBudget(), "b"],
    ]);
  });
});
