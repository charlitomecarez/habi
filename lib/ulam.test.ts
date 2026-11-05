import { describe, expect, it, vi } from "vitest";

import { bundledUlam, todayChoice, weekRows, weekSummary, type Ulam, type UlamDay } from "@/lib/ulam";
import { BACKUP_ULAM } from "@/lib/ulam-backup";
import { MAX_KCAL, MAX_LIMIT, MAX_STEPS, MIN_STEPS, ULAM_KINDS } from "@/supabase/functions/_shared/ulam";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const NOW = new Date(2026, 10, 5, 9, 0);

const ulam = (name: string, cost = 30, kcal = 200): Ulam => ({
  name,
  kind: "egg",
  ingredients: [],
  cost,
  cookMinutes: 10,
  kcal,
  steps: [],
});
const day = (on_date: string, over: Partial<UlamDay> = {}): UlamDay => ({
  on_date,
  options: [ulam("First"), ulam("Second", 40, 300), ulam("Third")],
  picked: 0,
  custom: null,
  source: "groq",
  eaten: false,
  ...over,
});

describe("backup ulam", () => {
  it("has about 20 dishes with unique names", () => {
    expect(BACKUP_ULAM.length).toBeGreaterThanOrEqual(20);
    expect(new Set(BACKUP_ULAM.map((u) => u.name)).size).toBe(BACKUP_ULAM.length);
  });

  it.each(BACKUP_ULAM.map((u) => [u.name, u] as const))("%s meets the same rules as Groq", (_name, u) => {
    expect(u.cost).toBeLessThanOrEqual(MAX_LIMIT);
    expect(u.steps.length).toBeGreaterThanOrEqual(MIN_STEPS);
    expect(u.steps.length).toBeLessThanOrEqual(MAX_STEPS);
    expect(u.kcal).toBeLessThanOrEqual(MAX_KCAL);
    expect(ULAM_KINDS).toContain(u.kind);
  });

  it("keeps most dishes near ₱50", () => {
    expect(BACKUP_ULAM.filter((u) => u.cost <= 60).length).toBeGreaterThan(BACKUP_ULAM.length / 2);
  });
});

describe("bundledUlam", () => {
  it("gives the same 3 on the same day, and others the next day", () => {
    const names = (d: Date) => bundledUlam(d).map((u) => u.name);
    expect(names(NOW)).toHaveLength(3);
    expect(names(NOW)).toEqual(names(new Date(2026, 10, 5, 22, 0)));
    expect(names(NOW)).not.toEqual(names(new Date(2026, 10, 6)));
  });

  it("keeps to your limit", () => {
    expect(bundledUlam(NOW, 30).every((u) => u.cost <= 30)).toBe(true);
  });
});

describe("todayChoice", () => {
  it("uses the stored row and its pick", () => {
    expect(todayChoice(day("2026-11-05", { picked: 1 }), NOW)).toMatchObject({ picked: 1, backup: false });
  });

  it("falls back when the row is missing, or holds only what you typed", () => {
    expect(todayChoice(undefined, NOW).backup).toBe(true);
    expect(todayChoice(day("2026-11-05", { options: [] }), NOW).backup).toBe(true);
  });
});

describe("weekRows", () => {
  it("always gives 7 rows, today first", () => {
    const rows = weekRows([], NOW);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ date: "2026-11-05", isToday: true });
    expect(rows[6].date).toBe("2026-10-30");
  });

  it("drops a row older than 7 days", () => {
    const rows = weekRows([day("2026-10-29", { eaten: true })], NOW);
    expect(rows.some((r) => r.date === "2026-10-29")).toBe(false);
    expect(rows.every((r) => !r.eaten)).toBe(true);
  });

  it("shows today's suggestion, but hides a past day you did not log", () => {
    const rows = weekRows([day("2026-11-05"), day("2026-11-04")], NOW);
    expect(rows[0].name).toBe("First");
    expect(rows[1].name).toBeNull();
  });

  it("shows what you typed over the suggestion", () => {
    const custom = { name: "Sinigang", cost: 60, kcal: null };
    expect(weekRows([day("2026-11-05", { custom, eaten: true })], NOW)[0]).toMatchObject(custom);
  });
});

describe("weekSummary", () => {
  it("counts only eaten days, and adds rice to the average", () => {
    const rows = weekRows(
      [day("2026-11-05"), day("2026-11-04", { eaten: true }), day("2026-11-03", { eaten: true, picked: 1 })],
      NOW,
    );
    expect(weekSummary(rows)).toEqual({ spent: 70, logged: 2, averageKcalWithRice: 450 });
  });

  it("has no average with no calories", () => {
    expect(weekSummary(weekRows([], NOW)).averageKcalWithRice).toBeNull();
  });
});
