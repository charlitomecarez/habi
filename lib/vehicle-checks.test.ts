import { describe, expect, it, vi } from "vitest";

import { currentTicks, toggleTick, type CheckTicks } from "@/lib/vehicle-checks";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

// Nov 7, 2026 is a Saturday, and its week starts on Monday, Nov 2.
const SATURDAY = new Date(2026, 10, 7, 9, 0);
const saved: CheckTicks = { day: "2026-11-07", week: "2026-11-02", daily: ["tires"], weekly: ["pads"] };

describe("currentTicks", () => {
  it("keeps the ticks in the same day", () => {
    expect(currentTicks(saved, new Date(2026, 10, 7, 22, 0))).toEqual(saved);
  });

  it("clears the daily list the next day, and keeps the weekly list", () => {
    expect(currentTicks(saved, new Date(2026, 10, 8, 6, 0))).toMatchObject({ daily: [], weekly: ["pads"] });
  });

  it("clears both lists on Monday", () => {
    expect(currentTicks(saved, new Date(2026, 10, 9, 6, 0))).toMatchObject({ daily: [], weekly: [] });
  });

  it("starts empty", () => {
    expect(currentTicks(null, SATURDAY)).toMatchObject({ daily: [], weekly: [] });
  });
});

describe("toggleTick", () => {
  it("adds and removes a tick", () => {
    expect(toggleTick(saved, "daily", "oil", SATURDAY).daily).toEqual(["tires", "oil"]);
    expect(toggleTick(saved, "daily", "tires", SATURDAY).daily).toEqual([]);
  });

  it("does not bring back an old day's ticks", () => {
    expect(toggleTick(saved, "daily", "oil", new Date(2026, 10, 8, 6, 0)).daily).toEqual(["oil"]);
  });
});
