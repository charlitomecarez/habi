import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";
import {
  useAddVehicle,
  useLastReading,
  useLogOdometer,
  useLogService,
  useMarkServicesDone,
  useServiceDue,
  useVehicle,
  useVehicleModels,
} from "@/lib/vehicles";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
vi.mock("@/lib/photos", () => ({ uploadPhoto: vi.fn(async () => "receipts/log1.webp") }));

const fail = { error: new Error("down") };

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("vehicle reads", () => {
  it("reads the primary vehicle and its last reading", async () => {
    respond({ data: { id: "v1" } }, { data: { odometer_km: 1200 } });
    expect(await runQuery(useVehicle())).toEqual({ id: "v1" });
    expect(await runQuery(useLastReading("v1"))).toEqual({ odometer_km: 1200 });
    expect(useLastReading(undefined)).toMatchObject({ enabled: false });
    for (const hook of [useVehicle(), useLastReading("v1"), useVehicleModels(), useServiceDue("v1")]) {
      respond(fail);
      await expect(runQuery(hook)).rejects.toThrow("down");
    }
  });

  it("maps the services due", async () => {
    respond({
      data: [
        {
          vehicle_service_id: "s1",
          item: "Oil",
          status: "due_soon",
          next_due_km: 3000,
          next_due_on: null,
          km_remaining: 200,
          interval_km: 1500,
          days_remaining: null,
          sort_order: null,
        },
      ],
    });
    expect(await runQuery(useServiceDue("v1"))).toEqual([
      {
        vehicleServiceId: "s1",
        item: "Oil",
        status: "due_soon",
        nextDueKm: 3000,
        nextDueOn: null,
        kmRemaining: 200,
        intervalKm: 1500,
        daysRemaining: null,
        sortOrder: 0,
      },
    ]);
    expect(argsOf("eq")).toEqual([["vehicle_id", "v1"]]);
  });

  it("maps the models", async () => {
    respond({ data: [{ id: "m1", make: "Honda", model: "Click 125", is_default: true }] });
    expect(await runQuery(useVehicleModels())).toEqual([
      { id: "m1", make: "Honda", model: "Click 125", isDefault: true },
    ]);
  });
});

describe("vehicle writes", () => {
  it("adds a vehicle and logs a reading", async () => {
    await runMutation(useAddVehicle(), {
      model: { id: "m1", make: "Honda", model: "Click" },
      nickname: null,
      odometerKm: 10,
    });
    await runMutation(useLogOdometer(), {
      vehicleId: "v1",
      odometerKm: 20,
      loggedAt: new Date("2026-11-11T00:00:00Z"),
      note: null,
    });
    expect(argsOf("insert")[0][0]).toMatchObject({ model_id: "m1", is_primary: true });
    expect(argsOf("insert")[1][0]).toMatchObject({ logged_at: "2026-11-11T00:00:00.000Z", is_correction: false });
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(6);
    respond(fail);
    await expect(runMutation(useAddVehicle(), { model: { id: "m" }, nickname: null, odometerKm: 1 })).rejects.toThrow(
      "down",
    );
    respond(fail);
    await expect(
      runMutation(useLogOdometer(), { vehicleId: "v", odometerKm: 1, loggedAt: new Date(), note: null }),
    ).rejects.toThrow("down");
  });

  const base = {
    vehicleId: "v1",
    odometerKm: 3000,
    servicedOn: new Date(2026, 10, 9),
    cost: 450,
    shop: null,
    notes: null,
    receipt: null,
  };

  it("logs a service for an existing item", async () => {
    respond({ data: { id: "log1" } });
    await runMutation(useLogService(), { ...base, service: { id: "s1" } });
    expect(targets()).toEqual(["service_logs"]);
    expect(argsOf("insert")[0][0]).toMatchObject({ vehicle_service_id: "s1", serviced_on: "2026-11-09" });
  });

  it("adds an Other item, then the log and its receipt", async () => {
    respond({ data: { id: "s9" } }, { data: { id: "log1" } });
    await runMutation(useLogService(), {
      ...base,
      service: { newItem: "Chain" },
      receipt: { uri: "f", width: 1, height: 1 },
    });
    expect(targets()).toEqual(["vehicle_services", "service_logs", "service_logs"]);
    expect(argsOf("update")[0][0]).toEqual({ receipt_path: "receipts/log1.webp" });
  });

  it("throws each service log error", async () => {
    respond(fail);
    await expect(runMutation(useLogService(), { ...base, service: { newItem: "Chain" } })).rejects.toThrow("down");
    respond(fail);
    await expect(runMutation(useLogService(), { ...base, service: { id: "s1" } })).rejects.toThrow("down");
    respond({ data: { id: "log1" } }, fail);
    await expect(
      runMutation(useLogService(), { ...base, service: { id: "s1" }, receipt: { uri: "f", width: 1, height: 1 } }),
    ).rejects.toThrow("down");
  });

  it("marks several services done in one insert", async () => {
    await runMutation(useMarkServicesDone(), {
      vehicleId: "v1",
      serviceIds: ["a", "b"],
      odometerKm: 5,
      servicedOn: new Date(2026, 0, 2),
    });
    expect(argsOf("insert")[0][0]).toHaveLength(2);
    respond(fail);
    await expect(
      runMutation(useMarkServicesDone(), { vehicleId: "v1", serviceIds: [], odometerKm: 5, servicedOn: new Date() }),
    ).rejects.toThrow("down");
  });
});
