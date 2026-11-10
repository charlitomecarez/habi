import { describe, expect, it, vi } from "vitest";

import { adviceState, hasRecentNumbers, healthDayRows, type HealthInsight } from "@/lib/health-check";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("react-native", () => ({ AppState: {} }));
vi.mock("@/lib/screen-time", () => ({ readScreenEvents: vi.fn() }));
vi.mock("@/lib/health-connect", () => ({}));

const now = new Date(2026, 10, 10, 12, 0);
const at = (h: number, m = 0) => new Date(2026, 10, 10, h, m);
const insight = (day: string): HealthInsight => ({
  id: day,
  day,
  tips: ["Sleep by 11 PM."],
  based_on: day,
  created_at: `${day}T09:46:00Z`,
});

describe("healthDayRows", () => {
  it("sends the last 7 days of sleep and steps, and skips empty days", () => {
    const rows = healthDayRows(
      {
        "2026-11-10": { bed: "23:20", wake: "06:45", source: "screen" },
        "2026-11-08": { bed: "00:30", wake: "07:00" },
      },
      [0, 0, 0, 0, 3000, 0, 6214],
      now,
    );
    expect(rows).toEqual([
      {
        day: "2026-11-08",
        sleep_minutes: 390,
        bed_time: "00:30",
        wake_time: "07:00",
        sleep_source: "typed",
        steps: 3000,
      },
      {
        day: "2026-11-10",
        sleep_minutes: 445,
        bed_time: "23:20",
        wake_time: "06:45",
        sleep_source: "screen",
        steps: 6214,
      },
    ]);
  });

  it("sends sleep alone on the web, which has no steps", () => {
    const rows = healthDayRows({ "2026-11-10": { bed: "23:00", wake: "06:00", source: "typed" } }, [], now);
    expect(rows).toHaveLength(1);
    expect(rows[0].steps).toBeNull();
  });

  it("knows whether the last 3 days have numbers", () => {
    expect(hasRecentNumbers(healthDayRows({}, [9, 0, 0, 0, 0, 0, 0], now), now)).toBe(false);
    expect(hasRecentNumbers(healthDayRows({}, [0, 0, 0, 0, 5, 0, 0], now), now)).toBe(true);
  });
});

describe("adviceState", () => {
  it("is off until you turn it on", () => {
    expect(adviceState(false, [insight("2026-11-10")], true, at(19))).toEqual({ kind: "off" });
  });

  it("shows today's advice from 6 PM", () => {
    const today = insight("2026-11-10");
    expect(adviceState(true, [today], true, at(18))).toEqual({ kind: "today", insight: today });
    expect(adviceState(true, [today], true, at(17, 59)).kind).not.toBe("today");
  });

  it("shows yesterday's advice before 6 PM", () => {
    const yesterday = insight("2026-11-09");
    expect(adviceState(true, [yesterday], true, at(9))).toEqual({ kind: "yesterday", insight: yesterday });
  });

  it("says when the first advice comes", () => {
    expect(adviceState(true, [], true, at(9))).toEqual({ kind: "first" });
  });

  it("explains a missing advice after 6:15 PM", () => {
    expect(adviceState(true, [], true, at(18, 15))).toEqual({ kind: "none", reason: "failed" });
    expect(adviceState(true, [], false, at(20))).toEqual({ kind: "none", reason: "no-numbers" });
    expect(adviceState(true, [], true, at(18, 10))).toEqual({ kind: "first" });
  });
});
