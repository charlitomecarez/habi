import { describe, expect, it, vi } from "vitest";

import { habitRow, moneyRow, moneyStrand, todayIndex, todoRow, weekDays } from "@/lib/week";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

// A Saturday. The week runs from Monday, Nov 2.
const now = new Date(2026, 10, 7, 12);

describe("the week", () => {
  it("starts on Monday", () => {
    expect(weekDays(now)[0].getDate()).toBe(2);
    expect(weekDays(now)[6].getDate()).toBe(8);
    expect(todayIndex(now)).toBe(5);
  });
});

describe("money", () => {
  it("uses the 20% band", () => {
    expect(moneyStrand(100, 100)).toBe("good");
    expect(moneyStrand(120, 100)).toBe("watch");
    expect(moneyStrand(121, 100)).toBe("over");
  });

  it("leaves future days empty", () => {
    const row = moneyRow(new Map([["2026-11-03", 900]]), 3000, now);
    expect(row.days[1]).toBe("over");
    expect(row.days[0]).toBe("good");
    expect(row.days[6]).toBe("empty");
  });
});

describe("todos", () => {
  const at = (day: number) => new Date(2026, 10, day, 9).toISOString();

  it("marks a past day with one left as over, and today as watch", () => {
    const row = todoRow(
      [
        { due_at: at(3), completed_at: null },
        { due_at: at(4), completed_at: at(4) },
        { due_at: at(7), completed_at: null },
      ],
      now,
    );
    expect(row.days.slice(0, 6)).toEqual(["empty", "over", "good", "empty", "empty", "watch"]);
  });
});

describe("habits", () => {
  const habits = [
    { id: "a", schedule: "daily", weekdays: null },
    { id: "b", schedule: "daily", weekdays: null },
    { id: "c", schedule: "daily", weekdays: null },
  ] as never[];

  it("follows all, half or more, and less", () => {
    const checks = new Map([
      ["a", new Set(["2026-11-02", "2026-11-03", "2026-11-04"])],
      ["b", new Set(["2026-11-02", "2026-11-03"])],
      ["c", new Set(["2026-11-02"])],
    ]);
    const row = habitRow(habits, checks, now);
    expect(row.days.slice(0, 3)).toEqual(["good", "watch", "over"]);
    expect(row.days[6]).toBe("empty");
  });
});
