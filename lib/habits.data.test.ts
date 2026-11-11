import { beforeEach, describe, expect, it, vi } from "vitest";

import { useArchiveHabit, useDeleteHabit, useHabits, useSaveHabit, useToggleCheck } from "@/lib/habits";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

const fail = { error: new Error("down") };

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("habits data", () => {
  it("groups the checks by habit", async () => {
    respond(
      { data: [{ id: "h1" }] },
      {
        data: [
          { habit_id: "h1", on_date: "2026-11-10" },
          { habit_id: "h1", on_date: "2026-11-11" },
        ],
      },
    );
    const result = (await runQuery(useHabits())) as { checks: Map<string, Set<string>> };
    expect([...result.checks.get("h1")!]).toEqual(["2026-11-10", "2026-11-11"]);
    expect(targets()).toEqual(["habits", "habit_checks"]);
    respond(fail, {});
    await expect(runQuery(useHabits())).rejects.toThrow("down");
    respond({}, fail);
    await expect(runQuery(useHabits())).rejects.toThrow("down");
  });

  it("ticks a day before the server answers, and rolls back on an error", async () => {
    const previous = { habits: [], checks: new Map([["h1", new Set(["2026-11-10"])]]) };
    queryClient.getQueryData.mockReturnValue(previous);
    await runMutation(useToggleCheck(), { habitId: "h1", date: "2026-11-11", done: true });
    const next = queryClient.setQueryData.mock.calls[0][1] as typeof previous;
    expect([...next.checks.get("h1")!]).toEqual(["2026-11-10", "2026-11-11"]);
    expect(argsOf("upsert")[0]).toEqual([
      { habit_id: "h1", on_date: "2026-11-11" },
      { onConflict: "habit_id,on_date" },
    ]);

    respond(fail);
    await expect(runMutation(useToggleCheck(), { habitId: "h1", date: "2026-11-10", done: false })).rejects.toThrow(
      "down",
    );
    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(["habits"], previous);
    queryClient.getQueryData.mockReturnValue(undefined);
    await runMutation(useToggleCheck(), { habitId: "h2", date: "2026-11-10", done: false });
    expect(argsOf("eq").slice(-2)).toEqual([
      ["habit_id", "h2"],
      ["on_date", "2026-11-10"],
    ]);
  });

  it("saves only the fields of the chosen schedule", async () => {
    const input = { name: "Read", schedule: "weekdays" as const, weekdays: [1, 3], timesPerWeek: 3, remindTime: null };
    await runMutation(useSaveHabit(), { input });
    await runMutation(useSaveHabit(), { id: "h1", input: { ...input, schedule: "times_per_week" as const } });
    expect(argsOf("insert")[0][0]).toMatchObject({ weekdays: [1, 3], times_per_week: null });
    expect(argsOf("update")[0][0]).toMatchObject({ weekdays: [], times_per_week: 3 });
    respond(fail);
    await expect(runMutation(useSaveHabit(), { input })).rejects.toThrow("down");
  });

  it("archives and deletes a habit", async () => {
    await runMutation(useArchiveHabit(), "h1");
    await runMutation(useDeleteHabit(), "h1");
    expect(argsOf("update")[0][0]).toEqual({ archived: true });
    expect(argsOf("delete")).toHaveLength(1);
    for (const hook of [useArchiveHabit(), useDeleteHabit()]) {
      respond(fail);
      await expect(runMutation(hook, "h1")).rejects.toThrow("down");
    }
  });
});
