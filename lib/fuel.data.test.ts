import { beforeEach, describe, expect, it, vi } from "vitest";

import { economy, monthFuelCost, useDeleteFuel, useFuelLogs, useLogFuel, type FuelLog } from "@/lib/fuel";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

const log = (odometer_km: number, litres: number, full_tank: boolean, filled_on = "2026-11-01"): FuelLog =>
  ({ id: String(odometer_km), odometer_km, litres, full_tank, filled_on, total: litres * 60 }) as FuelLog;

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("fuel", () => {
  it("measures km per litre between full tanks", () => {
    const result = economy([log(1000, 4, true), log(1100, 2, false), log(1200, 3, true), log(1150, 1, false)]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ km: 200, litres: 6 });
  });

  it("adds the fuel cost of one month", () => {
    expect(monthFuelCost([log(1, 2, true, "2026-11-03"), log(2, 1, true, "2026-10-30")], new Date(2026, 10, 11))).toBe(
      120,
    );
  });

  it("reads the logs of one vehicle", async () => {
    respond({ data: [{ id: "f1" }] });
    expect(await runQuery(useFuelLogs("v1"))).toEqual([{ id: "f1" }]);
    expect(useFuelLogs(undefined)).toMatchObject({ enabled: false });
    respond({ error: new Error("down") });
    await expect(runQuery(useFuelLogs("v1"))).rejects.toThrow("down");
  });

  it("logs a fill-up in one call, and deletes one", async () => {
    await runMutation(useLogFuel(), {
      vehicleId: "v1",
      filledOn: new Date(2026, 10, 11),
      litres: 4,
      pricePerLitre: 62,
      odometerKm: 1500,
      fullTank: true,
      station: "Petron",
      accountId: "a1",
      categoryId: null,
    });
    expect(argsOf("rpc")[0][0]).toBe("log_fuel");
    expect(argsOf("rpc")[0][1]).toMatchObject({ p_filled_on: "2026-11-11", p_category_id: null });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["odometer-last"] });
    await runMutation(useDeleteFuel(), "f1");
    await expectWriteErrors([
      [useLogFuel(), { filledOn: new Date() }],
      [useDeleteFuel(), "f"],
    ]);
  });
});
