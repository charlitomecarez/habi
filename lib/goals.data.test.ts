import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  goalProgress,
  useAddContribution,
  useDeleteContribution,
  useDeleteGoal,
  useGoals,
  useSaveGoal,
} from "@/lib/goals";
import { runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

const goal = { id: "g1", name: "Laptop", target_amount: 60000, target_date: "2027-04-30", account_id: null };

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("savings goals", () => {
  it("works out what is left and the amount each month", () => {
    const now = new Date(2026, 10, 11);
    const progress = goalProgress(
      goal,
      [{ id: "c", goal_id: "g1", amount: 12000, on_date: "2026-11-01", note: null }],
      now,
    );
    expect(progress).toMatchObject({ saved: 12000, left: 48000, reached: false, monthsLeft: 6, perMonth: 8000 });
    expect(goalProgress({ ...goal, target_date: null }, [], now)).toMatchObject({ perMonth: null, monthsLeft: null });
    expect(
      goalProgress(goal, [{ id: "c", goal_id: "g1", amount: 70000, on_date: "x", note: null }], now),
    ).toMatchObject({ reached: true, left: 0 });
  });

  it("reads goals with their progress", async () => {
    respond({ data: [goal] }, { data: [] });
    const result = (await runQuery(useGoals())) as { goals: { saved: number }[] };
    expect(result.goals[0].saved).toBe(0);
    respond({ error: new Error("a") }, {});
    await expect(runQuery(useGoals())).rejects.toThrow("a");
    respond({}, { error: new Error("b") });
    await expect(runQuery(useGoals())).rejects.toThrow("b");
  });

  it("saves goals and contributions", async () => {
    await runMutation(useSaveGoal(), {
      name: "Laptop",
      target: 60000,
      targetDate: new Date(2027, 3, 30),
      accountId: null,
    });
    await runMutation(useSaveGoal(), { id: "g1", name: "Laptop", target: 60000, targetDate: null, accountId: "a1" });
    await runMutation(useAddContribution(), { goalId: "g1", amount: -500, on: new Date(2026, 10, 11), note: null });
    await runMutation(useDeleteContribution(), "c1");
    await runMutation(useDeleteGoal(), "g1");
    expect(argsOf("insert")[0][0]).toMatchObject({ target_date: "2027-04-30" });
    expect(argsOf("insert")[1][0]).toEqual({ goal_id: "g1", amount: -500, on_date: "2026-11-11", note: null });
    expect(argsOf("update")[0][0]).toMatchObject({ target_date: null, account_id: "a1" });
    await expectWriteErrors([
      [useSaveGoal(), { name: "x", target: 1, targetDate: null, accountId: null }],
      [useAddContribution(), { goalId: "g", amount: 1, on: new Date(), note: null }],
      [useDeleteContribution(), "c"],
      [useDeleteGoal(), "g"],
    ]);
  });
});
