import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureSession,
  useArchivePlan,
  useExerciseHistory,
  useGym,
  useSavePlan,
  useSessionSets,
  useToggleSet,
} from "@/lib/gym";
import { runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

const fail = { error: new Error("down") };

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("gym reads", () => {
  it("reads plans, exercises and sessions", async () => {
    respond({ data: [{ id: "p" }] }, { data: [] }, { data: [] });
    expect(await runQuery(useGym())).toEqual({ plans: [{ id: "p" }], exercises: [], sessions: [] });
    for (const order of [
      [fail, {}, {}],
      [{}, fail, {}],
      [{}, {}, fail],
    ]) {
      respond(...order);
      await expect(runQuery(useGym())).rejects.toThrow("down");
    }
  });

  it("reads the sets of a session and the history of an exercise", async () => {
    respond({ data: [{ id: "s" }] }, { data: [{ id: "h" }] });
    expect(await runQuery(useSessionSets("x"))).toEqual([{ id: "s" }]);
    expect(await runQuery(useExerciseHistory("e"))).toEqual([{ id: "h" }]);
    expect(useSessionSets(undefined)).toMatchObject({ enabled: false });
    for (const hook of [useSessionSets("x"), useExerciseHistory("e")]) {
      respond(fail);
      await expect(runQuery(hook)).rejects.toThrow("down");
    }
  });
});

describe("gym writes", () => {
  const input = {
    name: "Push",
    weekdays: [1, 4],
    remindTime: null,
    exercises: [
      { id: "e1", name: "Bench", sets: 3, reps: 8, weightKg: 40 },
      { name: "Dips", sets: 3, reps: 10, weightKg: null },
    ],
  };

  it("adds a plan with its exercises in order", async () => {
    respond({ data: { id: "p9" } });
    expect(await runMutation(useSavePlan(), { input, removedIds: [] })).toBe("p9");
    expect(argsOf("update")[0][0]).toMatchObject({ plan_id: "p9", sort_order: 0 });
    expect(argsOf("insert")[1][0]).toMatchObject({ plan_id: "p9", name: "Dips", sort_order: 1 });
  });

  it("updates a plan and deletes the removed exercises", async () => {
    await runMutation(useSavePlan(), { id: "p1", input, removedIds: ["e7"] });
    expect(argsOf("in")).toEqual([["id", ["e7"]]]);
    for (const order of [[fail], [{}, fail], [{}, {}, fail]]) {
      respond(...order);
      await expect(runMutation(useSavePlan(), { id: "p1", input, removedIds: ["e7"] })).rejects.toThrow("down");
    }
    respond(fail);
    await expect(runMutation(useSavePlan(), { input, removedIds: [] })).rejects.toThrow("down");
  });

  it("archives a plan", async () => {
    await runMutation(useArchivePlan(), "p1");
    expect(argsOf("update")[0][0]).toEqual({ archived: true });
    respond(fail);
    await expect(runMutation(useArchivePlan(), "p1")).rejects.toThrow("down");
  });

  it("makes the session once a day", async () => {
    respond({ data: { id: "s1" } });
    expect(await ensureSession({ id: "p1", name: "Push" }, "2026-11-11")).toBe("s1");
    expect(argsOf("upsert")[0][1]).toEqual({ onConflict: "plan_id,on_date" });
    respond(fail);
    await expect(ensureSession({ id: "p1", name: "Push" }, "2026-11-11")).rejects.toThrow("down");
  });

  it("ticks and unticks a set", async () => {
    const set = {
      plan: { id: "p1", name: "Push" },
      date: "2026-11-11",
      exercise: { id: "e1", name: "Bench" },
      setNumber: 2,
      reps: 8,
      weightKg: 40,
    };
    respond({ data: { id: "s1" } });
    await runMutation(useToggleSet(), { ...set, done: true });
    respond({ data: { id: "s1" } });
    await runMutation(useToggleSet(), { ...set, done: false });
    expect(targets()).toEqual(["workout_sessions", "workout_sets", "workout_sessions", "workout_sets"]);
    expect(argsOf("upsert")[1][0]).toMatchObject({ session_id: "s1", set_number: 2, weight_kg: 40 });
    respond({ data: { id: "s1" } }, fail);
    await expect(runMutation(useToggleSet(), { ...set, done: true })).rejects.toThrow("down");
  });
});
