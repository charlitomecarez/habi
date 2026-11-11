import { describe, expect, it, vi } from "vitest";

import { dailyWeights } from "@/lib/health-weights";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("react-native", () => ({ AppState: {} }));
vi.mock("@/lib/health-connect", () => ({}));

describe("dailyWeights", () => {
  const at = (d: number, h: number) => new Date(2026, 10, d, h).getTime();

  it("keeps the last weight of each day, to one decimal, oldest day first", () => {
    expect(
      dailyWeights([
        { at: at(10, 20), kg: 68.44 },
        { at: at(8, 7), kg: 68.9 },
        { at: at(10, 7), kg: 69.01 },
      ]),
    ).toEqual([
      { on_date: "2026-11-08", weight_kg: 68.9 },
      { on_date: "2026-11-10", weight_kg: 68.4 },
    ]);
  });

  it("is empty with no weights", () => {
    expect(dailyWeights([])).toEqual([]);
  });
});
