import { describe, expect, it } from "vitest";

import {
  alarmTimeText,
  AWAKE_ID,
  daysText,
  isStopLabel,
  isUserAlarm,
  makeSums,
  nextAlarmText,
  nextRing,
  STOP_LABEL,
  TEST_ID,
  type Alarm,
} from "@/lib/alarm-rules";

// Thursday, Nov 5, 2026.
const NOW = new Date(2026, 10, 5, 21, 18);

const alarm = (over: Partial<Alarm> = {}): Alarm => ({
  id: "a",
  hour: 5,
  minute: 30,
  days: [],
  label: "",
  enabled: true,
  atMs: null,
  ...over,
});

describe("makeSums", () => {
  it("makes correct, easy sums", () => {
    for (const sum of makeSums(200)) {
      const [a, sign, b] = sum.text.split(" ");
      expect(sum.answer).toBe(sign === "+" ? Number(a) + Number(b) : Number(a) * Number(b));
      expect(Number(a)).toBeLessThanOrEqual(9);
      expect(Number(b)).toBeLessThanOrEqual(9);
    }
  });

  it("makes as many as you ask for", () => {
    expect(makeSums(8)).toHaveLength(8);
  });
});

describe("isStopLabel", () => {
  it("accepts only the stop label", () => {
    expect(isStopLabel(`  ${STOP_LABEL}\n`)).toBe(true);
    expect(isStopLabel("myapp://inventory?location=x")).toBe(false);
  });
});

describe("nextRing", () => {
  it("rings tomorrow when today's time has passed", () => {
    expect(nextRing(alarm(), NOW)).toEqual(new Date(2026, 10, 6, 5, 30));
  });

  it("rings later today when the time is still ahead", () => {
    expect(nextRing(alarm({ hour: 22, minute: 0 }), NOW)).toEqual(new Date(2026, 10, 5, 22, 0));
  });

  it("skips to the next chosen weekday", () => {
    expect(nextRing(alarm({ days: [1] }), NOW)).toEqual(new Date(2026, 10, 9, 5, 30));
  });

  it("rings next week on the same weekday when today's time has passed", () => {
    expect(nextRing(alarm({ days: [4] }), NOW)).toEqual(new Date(2026, 10, 12, 5, 30));
  });

  it("treats Sunday as day 7", () => {
    expect(nextRing(alarm({ days: [7] }), NOW)).toEqual(new Date(2026, 10, 8, 5, 30));
  });

  it("does not ring when off, or after a fixed moment has passed", () => {
    expect(nextRing(alarm({ enabled: false }), NOW)).toBeNull();
    expect(nextRing(alarm({ atMs: NOW.getTime() - 1 }), NOW)).toBeNull();
  });
});

describe("text", () => {
  it("words the time", () => {
    expect(alarmTimeText({ hour: 5, minute: 30 })).toBe("5:30 AM");
    expect(alarmTimeText({ hour: 0, minute: 5 })).toBe("12:05 AM");
  });

  it("words the days", () => {
    expect(daysText([])).toBe("Once");
    expect(daysText([5, 4, 3, 2, 1])).toBe("Mon to Fri");
    expect(daysText([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
    expect(daysText([6, 7])).toBe("Weekends");
    expect(daysText([1, 3])).toBe("Mon, Wed");
  });

  it("words the wait", () => {
    expect(nextAlarmText([alarm()], NOW)).toBe("Next alarm in 8 hours 12 minutes");
    expect(nextAlarmText([alarm({ hour: 21, minute: 19 })], NOW)).toBe("Next alarm in 1 minute");
    expect(nextAlarmText([alarm({ enabled: false })], NOW)).toBeNull();
  });
});

describe("isUserAlarm", () => {
  it("hides the test and the awake check", () => {
    expect(isUserAlarm(alarm({ id: TEST_ID }))).toBe(false);
    expect(isUserAlarm(alarm({ id: AWAKE_ID }))).toBe(false);
    expect(isUserAlarm(alarm())).toBe(true);
  });
});
