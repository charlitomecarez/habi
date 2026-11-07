import { describe, expect, it, vi } from "vitest";

import { noLongerDueAt, usedShare, type ServiceDue } from "@/lib/vehicles";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/photos", () => ({ uploadPhoto: vi.fn() }));

const service = (over: Partial<ServiceDue>): ServiceDue => ({
  vehicleServiceId: "s",
  item: "Engine oil",
  status: "overdue",
  nextDueKm: 12000,
  nextDueOn: null,
  kmRemaining: null,
  intervalKm: null,
  daysRemaining: null,
  sortOrder: 0,
  ...over,
});

describe("usedShare", () => {
  it("shows how much of the interval is used", () => {
    expect(usedShare({ kmRemaining: 500, intervalKm: 2000 })).toBe(0.75);
  });

  it("stays between 0 and 1", () => {
    expect(usedShare({ kmRemaining: -300, intervalKm: 2000 })).toBe(1);
    expect(usedShare({ kmRemaining: 3000, intervalKm: 2000 })).toBe(0);
  });

  it("has no share with no km interval", () => {
    expect(usedShare({ kmRemaining: null, intervalKm: null })).toBeNull();
  });
});

describe("noLongerDueAt", () => {
  it("ends an item that a lower reading takes back under its km", () => {
    expect(noLongerDueAt([service({})], 11950, "2026-11-07")).toHaveLength(1);
  });

  it("keeps an item that is still past its km", () => {
    expect(noLongerDueAt([service({})], 12100, "2026-11-07")).toHaveLength(0);
  });

  it("keeps an item that is overdue by date", () => {
    expect(noLongerDueAt([service({ nextDueOn: "2026-11-01" })], 11950, "2026-11-07")).toHaveLength(0);
  });
});
