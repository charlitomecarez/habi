import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";
import {
  costText,
  useDeleteTrip,
  useDeleteTripItem,
  useMarkPaid,
  useSaveTrip,
  useSaveTripItem,
  useTrip,
  useTripItems,
  useTrips,
} from "@/lib/travel";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("travel data", () => {
  it("reads trips and the items of one trip", async () => {
    respond({ data: [{ id: "t1" }] }, { data: [{ id: "i1" }] });
    expect(await runQuery(useTrips())).toEqual([{ id: "t1" }]);
    expect(await runQuery(useTripItems("t1"))).toEqual([{ id: "i1" }]);
    expect(argsOf("eq")).toEqual([["trip_id", "t1"]]);
    expect(useTrip("t1").data).toBeUndefined();
    for (const hook of [useTrips(), useTripItems("t1")]) {
      respond({ error: new Error("down") });
      await expect(runQuery(hook)).rejects.toThrow("down");
    }
  });

  it("saves a trip and returns its id", async () => {
    const input = {
      title: "Baguio",
      destination: null,
      startDate: new Date(2026, 11, 12),
      endDate: new Date(2026, 11, 14),
      budget: 8000,
      note: null,
    };
    respond({ data: { id: "t9" } });
    expect(await runMutation(useSaveTrip(), { input })).toBe("t9");
    expect(argsOf("insert")[0][0]).toMatchObject({
      start_date: "2026-12-12",
      end_date: "2026-12-14",
      budget_php: 8000,
    });
    expect(await runMutation(useSaveTrip(), { id: "t1", input })).toBe("t1");
    respond({ error: new Error("down") });
    await expect(runMutation(useSaveTrip(), { id: "t1", input })).rejects.toThrow("down");
    await expectWriteErrors([[useSaveTrip(), { input }]]);
  });

  it("saves items, marks one paid and deletes", async () => {
    const input = { trip_id: "t1", title: "Dinner" } as never;
    await runMutation(useSaveTripItem(), { input });
    await runMutation(useSaveTripItem(), { id: "i1", input });
    await runMutation(useMarkPaid(), { itemId: "i1", accountId: "a1", amount: 900 });
    await runMutation(useDeleteTripItem(), "i1");
    await runMutation(useDeleteTrip(), "t1");
    expect(targets()).toEqual(["trip_items", "trip_items", "mark_trip_item_paid", "trip_items", "trips"]);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["money"] });
    await expectWriteErrors([
      [useSaveTripItem(), { input }],
      [useMarkPaid(), { itemId: "i", accountId: "a", amount: 1 }],
      [useDeleteTripItem(), "i"],
      [useDeleteTrip(), "t"],
    ]);
  });

  it("writes a cost in pesos or its own currency", () => {
    expect(costText({ cost: null, currency: "PHP" })).toBe("");
    expect(costText({ cost: 12.5, currency: "USD" })).toBe("USD 12.50");
  });
});
