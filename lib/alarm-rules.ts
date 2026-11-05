import { addDays, differenceInMinutes, format } from "date-fns";

// Pure alarm rules, with no native code, so they have tests.

export type Alarm = {
  id: string;
  hour: number;
  minute: number;
  /** 1 (Monday) to 7 (Sunday). Empty rings once. */
  days: number[];
  label: string;
  enabled: boolean;
  /** A fixed moment, for a one-time ring such as the test. */
  atMs: number | null;
};

export const TEST_ID = "test";
/** Keep in sync with AlarmService.AWAKE_ID. */
export const AWAKE_ID = "awake-check";
/** Keep in sync with AlarmService.AWAKE_WINDOW_MS. The alarm stays quiet this long, then rings. */
export const AWAKE_WINDOW_MS = 60 * 1000;
/** How long after you stop the alarm the awake check shows. */
export const AWAKE_DELAY_MS = 3 * 60 * 1000;

export const SUMS_AFTER_SCAN = 3;
/** More sums when the camera fails, because the backup can be done from bed. */
export const BACKUP_SUMS = 8;

/** The fixed text on the stop label, so a printed label works in every build. */
export const STOP_LABEL = "my-app:alarm-stop:v1";

export const isStopLabel = (text: string) => text.trim() === STOP_LABEL;

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

/** The alarms you made. The test ring and the awake check stay out of the list. */
export const isUserAlarm = (alarm: Alarm) => alarm.id !== TEST_ID && alarm.id !== AWAKE_ID;

export type Sum = { text: string; answer: number };

/** Easy sums for a sleepy head, such as 4 + 7 or 5 × 6. */
export function makeSums(count: number, random: () => number = Math.random): Sum[] {
  const digit = (from: number, to: number) => from + Math.floor(random() * (to - from + 1));
  return Array.from({ length: count }, () => {
    const add = random() < 0.5;
    const a = add ? digit(1, 9) : digit(2, 9);
    const b = add ? digit(1, 9) : digit(2, 9);
    return add ? { text: `${a} + ${b}`, answer: a + b } : { text: `${a} × ${b}`, answer: a * b };
  });
}

const mondayFirst = (date: Date) => ((date.getDay() + 6) % 7) + 1;

/** The next ring after `now`, or null. Keep in sync with AlarmSpec.nextTrigger. */
export function nextRing(alarm: Alarm, now = new Date()): Date | null {
  if (!alarm.enabled) return null;
  if (alarm.atMs !== null) return alarm.atMs > now.getTime() ? new Date(alarm.atMs) : null;
  for (let offset = 0; offset <= 7; offset++) {
    const day = addDays(now, offset);
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), alarm.hour, alarm.minute);
    if (at > now && (alarm.days.length === 0 || alarm.days.includes(mondayFirst(at)))) return at;
  }
  return null;
}

/** "5:30 AM" */
export function alarmTimeText(alarm: Pick<Alarm, "hour" | "minute">): string {
  return format(new Date(2026, 0, 1, alarm.hour, alarm.minute), "h:mm a");
}

/** "Mon to Fri", "Every day", "Weekends", "Once", or a short list. */
export function daysText(days: readonly number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const key = sorted.join("");
  if (key === "") return "Once";
  if (key === "1234567") return "Every day";
  if (key === "12345") return "Mon to Fri";
  if (key === "67") return "Weekends";
  return sorted.map((d) => WEEKDAY_OPTIONS[d - 1].label).join(", ");
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Next alarm in 8 hours 12 minutes", or null with nothing on. */
export function nextAlarmText(alarms: readonly Alarm[], now = new Date()): string | null {
  const rings = alarms.flatMap((a) => nextRing(a, now) ?? []).sort((a, b) => a.getTime() - b.getTime());
  if (rings.length === 0) return null;
  const minutes = Math.max(differenceInMinutes(rings[0], now), 1);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 24) return `Next alarm in ${plural(Math.floor(hours / 24), "day")} ${plural(hours % 24, "hour")}`;
  return `Next alarm in ${hours > 0 ? `${plural(hours, "hour")} ` : ""}${plural(rest, "minute")}`;
}
