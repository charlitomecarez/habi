import { describe, expect, it, vi } from "vitest";

import { bedtimePoints, clockFromNoon, lengthPoints, scoreStatus, sleepScore, sleepWeek } from "@/lib/sleep-score";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("react-native", () => ({ AppState: {} }));
vi.mock("@/lib/screen-time", () => ({ readScreenEvents: vi.fn() }));
vi.mock("@/lib/health-connect", () => ({ readNightSleep: vi.fn() }));

describe("lengthPoints", () => {
  it("gives all 70 from 7 to 9 hours", () => {
    expect(lengthPoints(7 * 60)).toBe(70);
    expect(lengthPoints(9 * 60)).toBe(70);
  });

  it("takes 10 for each 30 minutes under 7 hours", () => {
    expect(lengthPoints(7 * 60 - 1)).toBe(60);
    expect(lengthPoints(6 * 60 + 30)).toBe(60);
    expect(lengthPoints(6 * 60)).toBe(50);
  });

  it("takes 10 for each 30 minutes over 9 hours", () => {
    expect(lengthPoints(9 * 60 + 1)).toBe(60);
    expect(lengthPoints(10 * 60)).toBe(50);
  });

  it("never goes under 0", () => {
    expect(lengthPoints(60)).toBe(0);
  });
});

describe("bedtimePoints", () => {
  const middle = clockFromNoon("23:30");

  it("crosses midnight", () => {
    expect(clockFromNoon("00:15") - clockFromNoon("23:45")).toBe(30);
  });

  it("gives all 30 within 45 minutes", () => {
    expect(bedtimePoints("00:15", middle)).toBe(30);
    expect(bedtimePoints("22:45", middle)).toBe(30);
  });

  it("takes 10 for each 30 minutes more", () => {
    expect(bedtimePoints("00:16", middle)).toBe(20);
    expect(bedtimePoints("00:45", middle)).toBe(20);
    expect(bedtimePoints("01:15", middle)).toBe(10);
    expect(bedtimePoints("03:00", middle)).toBe(0);
  });
});

describe("scoreStatus", () => {
  it("names each band", () => {
    expect(scoreStatus(100)).toEqual({ label: "Rested", tone: "good" });
    expect(scoreStatus(80)).toEqual({ label: "Rested", tone: "good" });
    expect(scoreStatus(79)).toEqual({ label: "Fair", tone: "watch" });
    expect(scoreStatus(60)).toEqual({ label: "Fair", tone: "watch" });
    expect(scoreStatus(59)).toEqual({ label: "Poor", tone: "over" });
  });
});

describe("sleepScore", () => {
  it("adds length and bedtime", () => {
    expect(sleepScore({ bed: "23:20", wake: "06:45" }, clockFromNoon("23:30"))).toBe(100);
    expect(sleepScore({ bed: "01:30", wake: "06:20" }, clockFromNoon("23:30"))).toBe(20);
  });
});

describe("sleepWeek", () => {
  const monday = new Date(2026, 10, 9);
  const now = new Date(2026, 10, 12, 8);
  const log = {
    "2026-11-09": { bed: "23:00", wake: "06:30" },
    "2026-11-10": { bed: "23:30", wake: "06:30" },
    "2026-11-12": { bed: "00:00", wake: "06:00" },
  };

  it("lists the days up to today, and leaves out the days ahead", () => {
    const week = sleepWeek(log, monday, now);
    expect(week.nights).toHaveLength(4);
    expect(week.nights[2].entry).toBeUndefined();
    expect(week.count).toBe(3);
  });

  it("gives the averages and the usual times", () => {
    const week = sleepWeek(log, monday, now);
    expect(week.average).toBe(410);
    expect(week.usualBed).toBe("11:30 PM");
    expect(week.usualWake).toBe("6:30 AM");
  });

  it("is empty with no nights", () => {
    expect(sleepWeek({}, monday, now)).toMatchObject({ count: 0, average: 0 });
  });
});
