import { describe, expect, it, vi } from "vitest";

import { isScheduled, scheduleText, streak, timeLabel, weekCount } from "@/lib/habits";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const checks = (...days: string[]) => new Set(days);

describe("habit rules", () => {
  it("describes the schedule", () => {
    expect(scheduleText({ schedule: "daily", weekdays: [], times_per_week: null })).toBe("Every day");
    expect(scheduleText({ schedule: "times_per_week", weekdays: [], times_per_week: 3 })).toBe("3 times a week");
    expect(scheduleText({ schedule: "times_per_week", weekdays: [], times_per_week: null })).toBe("1 times a week");
    expect(scheduleText({ schedule: "weekdays", weekdays: [5, 1], times_per_week: null })).toBe("Mon, Fri");
  });

  it("knows the scheduled days and counts a week", () => {
    const wed = new Date(2026, 10, 11);
    expect(isScheduled({ schedule: "weekdays", weekdays: [1] }, wed)).toBe(false);
    expect(isScheduled({ schedule: "daily", weekdays: [] }, wed)).toBe(true);
    expect(weekCount(checks("2026-11-09", "2026-11-11", "2026-11-16"), wed)).toBe(2);
  });

  it("counts a daily streak, skipping days off the schedule", () => {
    const now = new Date(2026, 10, 11);
    const h = { schedule: "weekdays" as const, weekdays: [1, 3], times_per_week: null, created_at: "2026-01-01" };
    expect(streak(h, checks("2026-11-11", "2026-11-09", "2026-11-04"), now)).toEqual({ count: 3, unit: "day" });
    const daily = { ...h, schedule: "daily" as const };
    expect(streak(daily, checks("2026-11-10", "2026-11-09"), now)).toEqual({ count: 2, unit: "day" });
  });

  it("counts weeks that reached the number", () => {
    const now = new Date(2026, 10, 11);
    const h = { schedule: "times_per_week" as const, weekdays: [], times_per_week: 2, created_at: "2026-10-01" };
    expect(streak(h, checks("2026-11-03", "2026-11-05", "2026-10-27", "2026-10-28"), now)).toEqual({
      count: 2,
      unit: "week",
    });
    expect(streak({ ...h, times_per_week: null }, checks("2026-11-10"), now)).toEqual({ count: 1, unit: "week" });
  });

  it("labels a reminder time", () => {
    expect(timeLabel(null)).toBe("No reminder");
    expect(timeLabel("18:30")).toBe("6:30 PM");
  });
});
