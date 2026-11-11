import { addDays, format } from "date-fns";

import { sleepMinutes, type SleepEntry, type SleepLog } from "@/lib/sleep";

// The sleep score of a night, from 0 to 100. Health Connect has none, so the app makes one.
// Length gives up to 70 points, and a regular bedtime up to 30.

const LENGTH_POINTS = 70;
const BEDTIME_POINTS = 30;
const STEP_MINUTES = 30;
const STEP_POINTS = 10;
const MIN_GOOD = 7 * 60;
const MAX_GOOD = 9 * 60;
const BEDTIME_SLACK = 45;

export type ScoreStatus = { label: "Rested" | "Fair" | "Poor"; tone: "good" | "watch" | "over" };

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Minutes after noon, so that 11 PM and 1 AM are close. */
export const clockFromNoon = (time: string) => (minutesOf(time) - 12 * 60 + 24 * 60) % (24 * 60);

const lose = (minutes: number) => STEP_POINTS * Math.ceil(minutes / STEP_MINUTES);

/** 7 to 9 hours gets all 70. Each 30 minutes under 7 hours or over 9 takes 10 points. */
export function lengthPoints(minutes: number): number {
  const off = minutes < MIN_GOOD ? MIN_GOOD - minutes : Math.max(0, minutes - MAX_GOOD);
  return Math.max(0, LENGTH_POINTS - lose(off));
}

/** Within 45 minutes of the week's middle bedtime gets all 30. Each 30 minutes more takes 10. */
export function bedtimePoints(bed: string, middle: number): number {
  const drift = Math.abs(clockFromNoon(bed) - middle);
  return Math.max(0, BEDTIME_POINTS - lose(Math.max(0, drift - BEDTIME_SLACK)));
}

export function sleepScore(entry: SleepEntry, middleBed: number): number {
  return lengthPoints(sleepMinutes(entry)) + bedtimePoints(entry.bed, middleBed);
}

/** 80 or more is Rested, 60 to 79 is Fair, under 60 is Poor. */
export function scoreStatus(score: number): ScoreStatus {
  if (score >= 80) return { label: "Rested", tone: "good" };
  return score >= 60 ? { label: "Fair", tone: "watch" } : { label: "Poor", tone: "over" };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Minutes after noon back to a clock time, such as "11:34 PM". */
const clockText = (fromNoon: number) => format(new Date(2000, 0, 1, 12, fromNoon), "h:mm a");

export type Night = { day: Date; entry?: SleepEntry; minutes?: number; score?: number };

export type SleepWeek = {
  nights: Night[];
  /** Average length of the logged nights, in minutes. */
  average: number;
  /** Average score of the logged nights. */
  score: number;
  count: number;
  usualBed?: string;
  usualWake?: string;
};

/** The 7 nights from `monday`, keyed by the day you woke up. Days after `now` are left out. */
export function sleepWeek(log: SleepLog, monday: Date, now: Date): SleepWeek {
  const today = format(now, "yyyy-MM-dd");
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => format(d, "yyyy-MM-dd") <= today);
  const entries = days.map((day) => ({ day, entry: log[format(day, "yyyy-MM-dd")] }));
  const logged = entries.flatMap((n) => (n.entry ? [n.entry] : []));
  if (!logged.length) return { nights: entries, average: 0, score: 0, count: 0 };

  const middle = median(logged.map((e) => clockFromNoon(e.bed)));
  const nights: Night[] = entries.map((n) =>
    n.entry ? { ...n, minutes: sleepMinutes(n.entry), score: sleepScore(n.entry, middle) } : n,
  );
  const scored = nights.filter((n): n is Required<Night> => n.score !== undefined);
  const mean = (list: number[]) => Math.round(list.reduce((sum, v) => sum + v, 0) / list.length);
  return {
    nights,
    average: mean(scored.map((n) => n.minutes)),
    score: mean(scored.map((n) => n.score)),
    count: scored.length,
    usualBed: clockText(middle),
    usualWake: clockText(median(logged.map((e) => clockFromNoon(e.wake)))),
  };
}
