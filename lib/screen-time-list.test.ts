import { describe, expect, it } from "vitest";

import { appList, duration, guideText, sumApps, usageStatus } from "@/lib/screen-time-list";

const app = (name: string, minutes: number) => ({ packageName: `app.${name}`, label: name, totalMs: minutes * 60000 });

describe("duration", () => {
  it("reads like a person says it", () => {
    expect(duration(20_000)).toBe("under a minute");
    expect(duration(45 * 60000)).toBe("45 min");
    expect(duration(120 * 60000)).toBe("2 h");
    expect(duration(135 * 60000)).toBe("2 h 15 min");
  });
});

describe("appList", () => {
  it("lists every app longest first, with the top bar full", () => {
    const list = appList([app("Chrome", 20), app("YouTube", 80), app("Messenger", 40)]);
    expect(list.rows.map((r) => [r.label, r.share])).toEqual([
      ["YouTube", 1],
      ["Messenger", 0.5],
      ["Chrome", 0.25],
    ]);
    expect(list.folded).toBeNull();
  });

  it("folds apps under a minute into one row", () => {
    const list = appList([app("YouTube", 10), app("Clock", 0.5), app("Settings", 0.25), app("Unused", 0)]);
    expect(list.rows.map((r) => r.label)).toEqual(["YouTube"]);
    expect(list.folded).toEqual({ count: 2, totalMs: 45_000 });
  });

  it("is empty on a day with no use", () => {
    expect(appList([])).toEqual({ rows: [], folded: null });
  });
});

describe("sumApps", () => {
  it("adds up each app over the week", () => {
    const week = sumApps([[app("YouTube", 10), app("Chrome", 5)], [app("YouTube", 20)]]);
    expect(week.find((a) => a.label === "YouTube")?.totalMs).toBe(30 * 60000);
    expect(week).toHaveLength(2);
  });
});

describe("usage guide", () => {
  const hours = (h: number) => h * 60 * 60 * 1000;

  it("is within the guide up to 3 hours, above it under 5, and high from 5", () => {
    expect(usageStatus(hours(3))).toEqual({ label: "Within guide", tone: "good" });
    expect(usageStatus(hours(4))).toEqual({ label: "Above guide", tone: "watch" });
    expect(usageStatus(hours(5))).toEqual({ label: "High", tone: "over" });
  });

  it("says the time left of the guide or over it", () => {
    expect(guideText(hours(1.5))).toBe("1 h 30 min left of the 3 h guide");
    expect(guideText(hours(3.5))).toBe("30 min over the 3 h guide");
  });
});
