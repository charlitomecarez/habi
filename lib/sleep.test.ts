import { describe, expect, it, vi } from "vitest";

import { screenMayWrite, sleepMinutes, sleepRow, sleepStrand, sleepText, trimLog } from "@/lib/sleep";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("react-native", () => ({ AppState: {} }));
vi.mock("@/lib/screen-time", () => ({ readScreenEvents: vi.fn() }));

describe("sleepMinutes", () => {
  it("crosses midnight", () => {
    expect(sleepMinutes({ bed: "23:20", wake: "06:00" })).toBe(400);
  });

  it("works when you sleep after midnight", () => {
    expect(sleepMinutes({ bed: "01:00", wake: "07:30" })).toBe(390);
  });
});

describe("sleep words", () => {
  it("writes hours and minutes", () => {
    expect(sleepText(400)).toBe("6 h 40 min");
    expect(sleepText(420)).toBe("7 h");
  });

  it("uses the band rule", () => {
    expect(sleepStrand(420)).toBe("good");
    expect(sleepStrand(419)).toBe("watch");
    expect(sleepStrand(360)).toBe("watch");
    expect(sleepStrand(359)).toBe("over");
  });
});

describe("sleepRow", () => {
  it("keeps a day with no entry empty", () => {
    const row = sleepRow({ "2026-11-03": { bed: "23:00", wake: "06:30" } }, new Date(2026, 10, 7, 12));
    expect(row.days.slice(0, 2)).toEqual(["empty", "good"]);
    expect(row.details?.[1]).toBe("7 h 30 min");
  });
});

describe("trimLog", () => {
  it("drops old entries", () => {
    const entry = { bed: "23:00", wake: "06:00" };
    const log = trimLog({ "2026-01-01": entry, "2026-11-06": entry }, new Date(2026, 10, 7));
    expect(Object.keys(log)).toEqual(["2026-11-06"]);
  });
});

describe("screenMayWrite", () => {
  it("never writes over a typed sleep", () => {
    expect(screenMayWrite({ bed: "23:00", wake: "06:00", source: "typed" })).toBe(false);
    // v1.3.0 saved typed entries with no source.
    expect(screenMayWrite({ bed: "23:00", wake: "06:00" })).toBe(false);
  });

  it("writes a new night, or grows its own entry", () => {
    expect(screenMayWrite(undefined)).toBe(true);
    expect(screenMayWrite({ bed: "23:00", wake: "04:00", source: "screen" })).toBe(true);
  });
});
