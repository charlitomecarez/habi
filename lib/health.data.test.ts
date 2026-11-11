import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useDeleteMedicine,
  useDeleteVisit,
  useDeleteWeight,
  useHealth,
  useLogWeight,
  useMarkDose,
  useSaveMedicine,
  useSaveVisit,
  useSetVisitPhotos,
} from "@/lib/health";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

const fail = { error: new Error("down") };

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("health data", () => {
  it("reads the four lists, and throws the first error", async () => {
    respond({ data: [{ id: "m" }] }, { data: [] }, { data: [] }, { data: [] });
    expect(await runQuery(useHealth())).toEqual({ medicines: [{ id: "m" }], doses: [], visits: [], weights: [] });
    expect(targets()).toEqual(["medicines", "medicine_doses", "health_visits", "weight_logs"]);
    respond({}, {}, fail, {});
    await expect(runQuery(useHealth())).rejects.toThrow("down");
  });

  it("marks a dose before the server answers, and rolls back on an error", async () => {
    const previous = {
      doses: [
        { id: "d1", status: "pending" },
        { id: "d2", status: "pending" },
      ],
    };
    queryClient.getQueryData.mockReturnValue(previous);
    await runMutation(useMarkDose(), { id: "d1", status: "taken" });
    expect(queryClient.setQueryData.mock.calls[0][1]).toEqual({
      doses: [
        { id: "d1", status: "taken" },
        { id: "d2", status: "pending" },
      ],
    });
    expect(argsOf("update")[0][0]).toMatchObject({ status: "taken", marked_at: expect.any(String) });
    respond(fail);
    await expect(runMutation(useMarkDose(), { id: "d1", status: "pending" })).rejects.toThrow("down");
    expect(argsOf("update")[1][0]).toEqual({ status: "pending", marked_at: null });
    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(["health"], previous);
    queryClient.getQueryData.mockReturnValue(undefined);
  });

  it("saves a medicine with sorted times", async () => {
    const input = {
      name: "Amlodipine",
      dose: "5 mg",
      times: ["20:00", "08:00"],
      startOn: new Date(2026, 10, 1),
      endOn: new Date(2026, 10, 30),
      note: null,
    };
    await runMutation(useSaveMedicine(), { input });
    await runMutation(useSaveMedicine(), { id: "m1", input: { ...input, endOn: null } });
    expect(argsOf("insert")[0][0]).toMatchObject({
      times: ["08:00", "20:00"],
      start_on: "2026-11-01",
      end_on: "2026-11-30",
    });
    expect(argsOf("update")[0][0]).toMatchObject({ end_on: null });
    respond(fail);
    await expect(runMutation(useSaveMedicine(), { input })).rejects.toThrow("down");
  });

  it("saves a visit and returns its id", async () => {
    const input = { visitedOn: new Date(2026, 10, 2), doctor: "Dr. A", reason: "Check-up", notes: null };
    respond({ data: { id: "v9" } });
    expect(await runMutation(useSaveVisit(), { input })).toBe("v9");
    expect(await runMutation(useSaveVisit(), { id: "v1", input })).toBe("v1");
    respond(fail);
    await expect(runMutation(useSaveVisit(), { input })).rejects.toThrow("down");
    respond(fail);
    await expect(runMutation(useSaveVisit(), { id: "v1", input })).rejects.toThrow("down");
  });

  it("logs a typed weight once a day", async () => {
    await runMutation(useLogWeight(), { kg: 70.5, on: new Date(2026, 10, 11) });
    expect(argsOf("upsert")[0]).toEqual([
      { on_date: "2026-11-11", weight_kg: 70.5, source: "typed" },
      { onConflict: "user_id,on_date" },
    ]);
  });

  it("writes photos and deletes rows", async () => {
    await runMutation(useSetVisitPhotos(), { id: "v1", paths: ["a"] });
    await runMutation(useDeleteMedicine(), "m1");
    await runMutation(useDeleteVisit(), "v1");
    await runMutation(useDeleteWeight(), "w1");
    expect(targets()).toEqual(["health_visits", "medicines", "health_visits", "weight_logs"]);
    const writes: [unknown, unknown][] = [
      [useSetVisitPhotos(), { id: "v1", paths: [] }],
      [useDeleteMedicine(), "m"],
      [useDeleteVisit(), "v"],
      [useDeleteWeight(), "w"],
      [useLogWeight(), { kg: 1, on: new Date() }],
    ];
    for (const [hook, input] of writes) {
      respond(fail);
      await expect(runMutation(hook, input)).rejects.toThrow("down");
    }
  });
});
