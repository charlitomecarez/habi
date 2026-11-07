import { parseISO } from "date-fns";
import { describe, expect, it, vi } from "vitest";

import { isAutoRow, isDueOn, monthlyAmount, nextDate, nextText, scheduleText } from "@/lib/recurring";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const rule = (over = {}) => ({
  schedule: "daily",
  week_days: null,
  month_day: null,
  starts_on: "2026-11-01",
  ends_on: null,
  last_run_on: null,
  ...over,
});
const day = (text: string) => parseISO(text);

describe("isDueOn", () => {
  it("tells weekdays from weekends", () => {
    // 2026-11-07 is a Saturday.
    expect(isDueOn(rule({ schedule: "weekdays" }), day("2026-11-07"))).toBe(false);
    expect(isDueOn(rule({ schedule: "weekends" }), day("2026-11-07"))).toBe(true);
    expect(isDueOn(rule({ schedule: "weekdays" }), day("2026-11-09"))).toBe(true);
  });

  it("uses the picked days for weekly", () => {
    const friday = rule({ schedule: "weekly", week_days: [5] });
    expect(isDueOn(friday, day("2026-11-06"))).toBe(true);
    expect(isDueOn(friday, day("2026-11-07"))).toBe(false);
  });

  it("uses the last day of a short month for day 31", () => {
    const end = rule({ schedule: "monthly", month_day: 31 });
    expect(isDueOn(end, day("2026-02-28"))).toBe(true);
    expect(isDueOn(end, day("2028-02-28"))).toBe(false);
    expect(isDueOn(end, day("2028-02-29"))).toBe(true);
    expect(isDueOn(end, day("2026-04-30"))).toBe(true);
    expect(isDueOn(end, day("2026-03-31"))).toBe(true);
    expect(isDueOn(end, day("2026-03-30"))).toBe(false);
  });
});

describe("nextDate", () => {
  it("does not repeat a day that already ran", () => {
    expect(nextDate(rule({ last_run_on: "2026-11-07" }), day("2026-11-07"))).toBe("2026-11-08");
  });

  it("waits for the start date", () => {
    expect(nextDate(rule({ starts_on: "2026-12-01" }), day("2026-11-07"))).toBe("2026-12-01");
  });

  it("skips to Monday for a weekday rule on Saturday", () => {
    expect(nextDate(rule({ schedule: "weekdays" }), day("2026-11-07"))).toBe("2026-11-09");
  });

  it("returns null after the end date", () => {
    expect(nextDate(rule({ ends_on: "2026-11-06" }), day("2026-11-07"))).toBeNull();
  });
});

describe("text", () => {
  it("names the schedule", () => {
    expect(scheduleText(rule({ schedule: "weekly", week_days: [5, 1] }))).toBe("Weekly on Mon, Fri");
    expect(scheduleText(rule({ schedule: "monthly", month_day: 1 }))).toBe("Monthly on day 1");
  });

  it("says Today and Ended", () => {
    expect(nextText("2026-11-07", day("2026-11-07"))).toBe("Next: Today");
    expect(nextText(null, day("2026-11-07"))).toBe("Ended");
  });

  it("estimates a month", () => {
    expect(monthlyAmount({ ...rule({ schedule: "monthly", month_day: 1 }), amount: 900 })).toBe(900);
    expect(monthlyAmount({ ...rule({ schedule: "weekdays" }), amount: 100 })).toBe(2167);
  });

  it("finds an Auto row by its ref", () => {
    expect(isAutoRow("recurring:abc:2026-11-07")).toBe(true);
    expect(isAutoRow("subscription:abc:2026-11-07")).toBe(false);
    expect(isAutoRow(null)).toBe(false);
  });
});
