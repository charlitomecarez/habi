import { describe, expect, it, vi } from "vitest";

import { screenTimeLine, sleepLine } from "./content";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const now = new Date(2026, 10, 7, 8);

describe("sleepLine", () => {
  it("shows last night", () => {
    const log = { "2026-11-07": { bed: "23:20", wake: "06:00" } };
    expect(sleepLine(log, now)).toEqual({ lead: "6 h 40 min", note: "Last night · Watch" });
  });

  it("asks when nothing is logged", () => {
    expect(sleepLine({}, now).lead).toBe("Not logged");
  });
});

describe("screenTimeLine", () => {
  const hour = 60 * 60 * 1000;

  it("compares with the average", () => {
    expect(screenTimeLine(2.5 * hour, 3 * hour)).toEqual({ lead: "2 h 30 min", note: "30 min under average" });
    expect(screenTimeLine(4 * hour, 3 * hour).note).toBe("1 h 0 min over average");
  });

  it("says Off with no usage access", () => {
    expect(screenTimeLine(null, 0).lead).toBe("Off");
  });
});
