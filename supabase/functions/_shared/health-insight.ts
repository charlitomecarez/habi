// The 6 PM health check: which accounts are due, what goes to Groq, and which tips are kept.
// Pure, so the app tests can run it. The prompt holds numbers only: no name, no email, no ID.

export type HealthDay = {
  day: string;
  sleep_minutes: number | null;
  bed_time: string | null;
  wake_time: string | null;
  steps: number | null;
};

export type Weight = { on_date: string; weight_kg: number };

/** Local time window when the hourly job makes the advice. */
export const CHECK_FROM_MINUTE = 17 * 60 + 45;
export const CHECK_TO_MINUTE = 17 * 60 + 59;
/** With no numbers in this many days, there is no advice and no push. */
export const RECENT_DAYS = 3;
export const MAX_TIPS = 3;
export const MAX_TIP_CHARS = 200;
export const MAX_TOTAL_CHARS = 600;
export const PUSH_TITLE = "Your health check is ready";

function parts(timeZone: string, at: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: `${values.year}-${values.month}-${values.day}`,
    minute: Number(values.hour) * 60 + Number(values.minute),
  };
}

/** The local day when the account is due now (17:45 to 17:59 in its time zone), else null. */
export function dueDay(timeZone: string, now: Date): string | null {
  const { day, minute } = parts(timeZone, now);
  return minute >= CHECK_FROM_MINUTE && minute <= CHECK_TO_MINUTE ? day : null;
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const hasNumbers = (d: HealthDay) => (d.sleep_minutes ?? 0) > 0 || (d.steps ?? 0) > 0;

/**
 * The day the advice is based on: today, or the latest of the last 3 days with numbers.
 * Null when none of them has numbers, so the job makes no advice and sends no push.
 */
export function basedOn(days: HealthDay[], today: string): { day: string; usesEarlierDay: boolean } | null {
  for (let back = 0; back < RECENT_DAYS; back++) {
    const day = addDays(today, -back);
    const row = days.find((d) => d.day === day);
    if (row && hasNumbers(row)) return { day, usesEarlierDay: back > 0 };
  }
  return null;
}

/** "down 0.4 kg over 9 days", never a weight itself. */
export function weightTrend(weights: Weight[]): string {
  if (weights.length < 2) return "not enough weights to show a trend";
  const sorted = [...weights].sort((a, b) => a.on_date.localeCompare(b.on_date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const change = Math.round((last.weight_kg - first.weight_kg) * 10) / 10;
  const span = Math.round((Date.parse(last.on_date) - Date.parse(first.on_date)) / 86_400_000);
  if (change === 0) return `steady over ${span} days`;
  return `${change > 0 ? "up" : "down"} ${Math.abs(change)} kg over ${span} days`;
}

function hours(minutes: number | null): string {
  if (!minutes) return "no sleep";
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min sleep`;
}

/** One line a day, oldest first. Only numbers and times. */
export function dayLines(days: HealthDay[], today: string): string[] {
  const lines: string[] = [];
  for (let back = 6; back >= 0; back--) {
    const day = addDays(today, -back);
    const row = days.find((d) => d.day === day);
    if (!row || !hasNumbers(row)) {
      lines.push(`${day}: no numbers`);
      continue;
    }
    const sleep = row.sleep_minutes
      ? `${hours(row.sleep_minutes)}${row.bed_time && row.wake_time ? `, bed ${row.bed_time.slice(0, 5)}, up ${row.wake_time.slice(0, 5)}` : ""}`
      : "no sleep";
    lines.push(`${day}: ${sleep}, ${row.steps ?? 0} steps`);
  }
  return lines;
}

export function healthPrompt(days: HealthDay[], weights: Weight[], today: string, problems: string[] = []): string {
  const base = basedOn(days, today);
  const rules = [
    `Write 1 to ${MAX_TIPS} short tips for this person's evening, in plain English. Each tip is one sentence of at most ${MAX_TIP_CHARS} characters.`,
    'Talk to the person as "you" and "your". Use no name.',
    "Give habit tips only, about sleep, steps and the weight trend. Never give a diagnosis, never name an illness, and never suggest a medicine or a supplement.",
    "Never write a weight in kilograms. Say only that the weight went up, went down or stayed steady.",
    "Base the tips on the numbers below. Do not invent numbers.",
    base?.usesEarlierDay
      ? `Today has no numbers, so the first tip must say that it uses the numbers up to ${base.day === addDays(today, -1) ? "yesterday" : "an earlier day"}.`
      : "",
    'Answer with JSON only, in this form: {"tips": ["...", "..."]}',
  ].filter(Boolean);
  const fix = problems.length ? [`Your last answer had these problems. Fix them: ${problems.join(" ")}`] : [];
  return [
    ...rules,
    ...fix,
    "",
    "Sleep and steps for the last 7 days:",
    ...dayLines(days, today),
    "",
    `Weight trend: ${weightTrend(weights)}.`,
  ].join("\n");
}

const KILOGRAMS = /\d\s*(kg|kilo)/i;
const MEDICAL =
  /\b(diagnos|disease|disorder|insomnia|apnea|apnoea|medicine|medication|supplement|melatonin|pill|dose|prescri)/i;

export type TipsResult = { ok: true; tips: string[] } | { ok: false; problems: string[] };

/** Checks Groq's answer. Problems go back to Groq once, as the daily ulam does. */
export function parseTips(text: string, usesEarlierDay = false): TipsResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, problems: ["The answer was not JSON."] };
  }
  const raw = (value as { tips?: unknown })?.tips;
  if (!Array.isArray(raw)) return { ok: false, problems: ['The answer had no "tips" list.'] };
  const tips = raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean);
  const problems: string[] = [];
  if (tips.length === 0) problems.push("There were no tips.");
  if (tips.length > MAX_TIPS) problems.push(`There were more than ${MAX_TIPS} tips.`);
  if (tips.some((t) => t.length > MAX_TIP_CHARS)) problems.push(`A tip was longer than ${MAX_TIP_CHARS} characters.`);
  if (tips.join("").length > MAX_TOTAL_CHARS)
    problems.push(`The tips were longer than ${MAX_TOTAL_CHARS} characters in all.`);
  if (tips.some((t) => KILOGRAMS.test(t))) problems.push("A tip wrote a weight in kilograms.");
  if (tips.some((t) => MEDICAL.test(t))) problems.push("A tip named an illness, a diagnosis or a medicine.");
  if (usesEarlierDay && tips[0] && !/yesterday|earlier day|previous day|last (few |\d )?days|so far/i.test(tips[0])) {
    problems.push("The first tip did not say that it uses an earlier day's numbers.");
  }
  return problems.length ? { ok: false, problems } : { ok: true, tips };
}

/** 6:00 PM on `day` in the time zone, as an ISO time. */
export function sixPm(day: string, timeZone: string): string {
  // Start from 18:00 UTC, then move by the zone's offset on that day.
  const guess = new Date(`${day}T18:00:00Z`);
  const local = parts(timeZone, guess);
  const offsetMinutes = local.minute - 18 * 60 + (local.day === day ? 0 : local.day > day ? 24 * 60 : -24 * 60);
  return new Date(guess.getTime() - offsetMinutes * 60_000).toISOString();
}
