import { describe, expect, it } from "vitest";

import {
  basedOn,
  dayLines,
  dueDay,
  healthPrompt,
  parseTips,
  sixPm,
  weightTrend,
  type HealthDay,
} from "./health-insight";

const day = (d: string, sleep: number | null, steps: number | null): HealthDay => ({
  day: d,
  sleep_minutes: sleep,
  bed_time: sleep ? "23:20:00" : null,
  wake_time: sleep ? "06:45:00" : null,
  steps,
});

describe("dueDay", () => {
  it("is due from 5:45 to 5:59 PM local time only", () => {
    // 5:45 PM in Manila is 09:45 UTC.
    expect(dueDay("Asia/Manila", new Date("2026-11-10T09:45:00Z"))).toBe("2026-11-10");
    expect(dueDay("Asia/Manila", new Date("2026-11-10T09:59:00Z"))).toBe("2026-11-10");
    expect(dueDay("Asia/Manila", new Date("2026-11-10T09:44:00Z"))).toBeNull();
    expect(dueDay("Asia/Manila", new Date("2026-11-10T10:00:00Z"))).toBeNull();
  });

  it("uses each account's own time zone", () => {
    expect(dueDay("Asia/Tokyo", new Date("2026-11-10T08:50:00Z"))).toBe("2026-11-10");
    expect(dueDay("Asia/Manila", new Date("2026-11-10T08:50:00Z"))).toBeNull();
  });
});

describe("the 3-day rule", () => {
  it("uses today when it has numbers", () => {
    expect(basedOn([day("2026-11-10", 400, 5000)], "2026-11-10")).toEqual({ day: "2026-11-10", usesEarlierDay: false });
  });

  it("uses yesterday when today is empty, and says so", () => {
    const base = basedOn([day("2026-11-10", null, 0), day("2026-11-09", 420, 3000)], "2026-11-10");
    expect(base).toEqual({ day: "2026-11-09", usesEarlierDay: true });
  });

  it("gives no advice with no numbers in 3 days", () => {
    expect(basedOn([day("2026-11-07", 420, 3000)], "2026-11-10")).toBeNull();
    expect(basedOn([], "2026-11-10")).toBeNull();
  });
});

describe("the prompt", () => {
  const days = [day("2026-11-09", 380, 4200), day("2026-11-10", 445, 6214)];
  const weights = [
    { on_date: "2026-11-01", weight_kg: 72.4 },
    { on_date: "2026-11-10", weight_kg: 72.0 },
  ];

  it("holds no name, email or ID, and no weight in kilograms", () => {
    const prompt = healthPrompt(days, weights, "2026-11-10");
    expect(prompt).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}-/i);
    expect(prompt).not.toMatch(/72\.4|72\.0|\b72\b/);
    expect(prompt).toContain("Weight trend: down 0.4 kg over 9 days.");
  });

  it("has one line for each of the last 7 days", () => {
    const lines = dayLines(days, "2026-11-10");
    expect(lines).toHaveLength(7);
    expect(lines[0]).toBe("2026-11-04: no numbers");
    expect(lines[6]).toBe("2026-11-10: 7 h 25 min sleep, bed 23:20, up 06:45, 6214 steps");
  });

  it("asks the first tip to name yesterday when today is empty", () => {
    expect(healthPrompt([day("2026-11-09", 400, 100)], [], "2026-11-10")).toContain("up to yesterday");
  });

  it("passes the problems of the first answer back", () => {
    expect(healthPrompt(days, [], "2026-11-10", ["There were no tips."])).toContain("There were no tips.");
  });
});

describe("weightTrend", () => {
  it("says steady, up or down, never a weight", () => {
    expect(weightTrend([])).toBe("not enough weights to show a trend");
    expect(
      weightTrend([
        { on_date: "2026-11-01", weight_kg: 70 },
        { on_date: "2026-11-08", weight_kg: 70 },
      ]),
    ).toBe("steady over 7 days");
  });
});

describe("parseTips", () => {
  it("keeps 1 to 3 short tips", () => {
    expect(parseTips('{"tips": ["Sleep by 11 PM.", " Walk after dinner. "]}')).toEqual({
      ok: true,
      tips: ["Sleep by 11 PM.", "Walk after dinner."],
    });
  });

  it("rejects bad answers with a reason", () => {
    const problems = (text: string, earlier = false) => {
      const r = parseTips(text, earlier);
      return r.ok ? [] : r.problems;
    };
    expect(problems("not json")).toEqual(["The answer was not JSON."]);
    expect(problems('{"tips": []}')).toContain("There were no tips.");
    expect(problems('{"tips": ["a", "b", "c", "d"]}')).toContain("There were more than 3 tips.");
    expect(problems(JSON.stringify({ tips: ["x".repeat(201)] }))).toContain("A tip was longer than 200 characters.");
    expect(problems('{"tips": ["You weigh 72 kg now."]}')).toContain("A tip wrote a weight in kilograms.");
    expect(problems('{"tips": ["Try melatonin tonight."]}')).toContain(
      "A tip named an illness, a diagnosis or a medicine.",
    );
    expect(problems('{"tips": ["Sleep earlier."]}', true)).toContain(
      "The first tip did not say that it uses an earlier day's numbers.",
    );
    expect(problems('{"tips": ["From yesterday, sleep earlier."]}', true)).toEqual([]);
  });
});

describe("sixPm", () => {
  it("is 6:00 PM in the account's zone", () => {
    expect(sixPm("2026-11-10", "Asia/Manila")).toBe("2026-11-10T10:00:00.000Z");
    expect(sixPm("2026-11-10", "America/Los_Angeles")).toBe("2026-11-11T02:00:00.000Z");
    expect(sixPm("2026-11-10", "UTC")).toBe("2026-11-10T18:00:00.000Z");
  });
});
