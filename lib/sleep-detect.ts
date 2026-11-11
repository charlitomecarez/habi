import { set, subDays } from "date-fns";

// Finds last night's sleep from when the screen was off. Pure, so the tests can run it.
// A phone cannot tell sleep from a phone left on a table, so the result is always editable.

export type ScreenEvent = { at: number; on: boolean };
export type Span = { start: number; end: number };

/** A screen-on stretch shorter than this does not break the night, such as a check of the time. */
export const SHORT_CHECK_MS = 5 * 60 * 1000;
/** The shortest dark stretch that counts as sleep. */
export const MIN_SLEEP_MS = 3 * 60 * 60 * 1000;

/** The night that ends on `day`: 8 PM the day before to noon. */
export function nightWindow(day: Date): Span {
  return {
    start: set(subDays(day, 1), { hours: 20, minutes: 0, seconds: 0, milliseconds: 0 }).getTime(),
    end: set(day, { hours: 12, minutes: 0, seconds: 0, milliseconds: 0 }).getTime(),
  };
}

/**
 * The dark stretches inside the window, from screen on and off events. Before the first event, the
 * screen was in the opposite state of that event. A stretch still dark at the end stops at `until`.
 */
export function darkSpans(events: readonly ScreenEvent[], window: Span, until = window.end): Span[] {
  const end = Math.min(window.end, until);
  const sorted = events.filter((e) => e.at >= window.start && e.at <= end).sort((a, b) => a.at - b.at);
  if (sorted.length === 0) return [];
  const spans: Span[] = [];
  let darkSince: number | null = sorted[0].on ? window.start : null;
  for (const e of sorted) {
    if (!e.on && darkSince === null) darkSince = e.at;
    else if (e.on && darkSince !== null) {
      if (e.at > darkSince) spans.push({ start: darkSince, end: e.at });
      darkSince = null;
    }
  }
  if (darkSince !== null && end > darkSince) spans.push({ start: darkSince, end });
  return spans;
}

/** Joins dark stretches that only a short screen check split. */
export function mergeShortChecks(spans: readonly Span[], gapMs = SHORT_CHECK_MS): Span[] {
  const out: Span[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s.start - last.end < gapMs) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out;
}

/** The night's sleep: the longest dark stretch of 3 hours or more, or null when there is none. */
export function findSleep(events: readonly ScreenEvent[], day: Date, now = Date.now()): Span | null {
  const merged = mergeShortChecks(darkSpans(events, nightWindow(day), now));
  const longest = merged.reduce<Span | null>(
    (best, s) => (!best || s.end - s.start > best.end - best.start ? s : best),
    null,
  );
  return longest && longest.end - longest.start >= MIN_SLEEP_MS ? longest : null;
}

/** The longest Health Connect sleep session that ends between midnight and noon of `day`, or null. */
export function longestNightSession(sessions: readonly Span[], day: Date): Span | null {
  const midnight = set(day, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }).getTime();
  const noon = nightWindow(day).end;
  return sessions
    .filter((s) => s.end > s.start && s.end >= midnight && s.end <= noon)
    .reduce<Span | null>((best, s) => (!best || s.end - s.start > best.end - best.start ? s : best), null);
}
