import { describe, expect, it } from "vitest";

import { darkSpans, findSleep, mergeShortChecks, nightWindow, type ScreenEvent } from "@/lib/sleep-detect";

// The night that ends on Sunday Nov 8, 2026, in the phone's own time zone.
const day = new Date(2026, 10, 8, 9, 0);
const at = (dayOffset: 0 | -1, hours: number, minutes = 0) =>
  new Date(2026, 10, 8 + dayOffset, hours, minutes).getTime();
const off = (t: number): ScreenEvent => ({ at: t, on: false });
const on = (t: number): ScreenEvent => ({ at: t, on: true });
const hhmm = (t: number) => new Date(t).toTimeString().slice(0, 5);
const later = at(0, 13);

describe("findSleep", () => {
  it("finds a normal night", () => {
    const sleep = findSleep([on(at(-1, 21)), off(at(-1, 23, 42)), on(at(0, 6, 31)), off(at(0, 7))], day, later);
    expect(sleep && [hhmm(sleep.start), hhmm(sleep.end)]).toEqual(["23:42", "06:31"]);
  });

  it("does not split the night for a short check at 3 AM", () => {
    const events = [off(at(-1, 23)), on(at(0, 3)), off(at(0, 3, 2)), on(at(0, 6, 30))];
    const sleep = findSleep(events, day, later);
    expect(sleep && [hhmm(sleep.start), hhmm(sleep.end)]).toEqual(["23:00", "06:30"]);
  });

  it("takes the longer part when a long phone use splits the night", () => {
    const events = [off(at(-1, 22)), on(at(0, 1)), off(at(0, 1, 40)), on(at(0, 7))];
    const sleep = findSleep(events, day, later);
    expect(sleep && [hhmm(sleep.start), hhmm(sleep.end)]).toEqual(["01:40", "07:00"]);
  });

  it("finds nothing under 3 hours", () => {
    expect(findSleep([off(at(0, 2)), on(at(0, 4, 59))], day, later)).toBeNull();
  });

  it("finds nothing with no screen events", () => {
    expect(findSleep([], day, later)).toBeNull();
  });

  it("counts the screen as dark before a first screen-on event", () => {
    const sleep = findSleep([on(at(0, 5))], day, later);
    expect(sleep && [hhmm(sleep.start), hhmm(sleep.end)]).toEqual(["20:00", "05:00"]);
  });

  it("stops a night that is still open at now", () => {
    const sleep = findSleep([off(at(-1, 23))], day, at(0, 4));
    expect(sleep && [hhmm(sleep.start), hhmm(sleep.end)]).toEqual(["23:00", "04:00"]);
  });
});

describe("helpers", () => {
  it("keeps the window from 8 PM to noon", () => {
    const w = nightWindow(day);
    expect([hhmm(w.start), hhmm(w.end)]).toEqual(["20:00", "12:00"]);
  });

  it("ignores events outside the window", () => {
    expect(darkSpans([off(at(-1, 18)), on(at(-1, 19))], nightWindow(day), later)).toEqual([]);
  });

  it("joins only gaps under 5 minutes", () => {
    const spans = [
      { start: 0, end: 100 },
      { start: 100 + 4 * 60000, end: 200 + 4 * 60000 },
      { start: 10 * 60000 + 300, end: 10 * 60000 + 400 },
    ];
    expect(mergeShortChecks(spans)).toHaveLength(2);
  });
});
