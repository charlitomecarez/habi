import { addDays, addMonths, endOfDay, format, startOfDay, startOfMonth, subDays } from "date-fns";

import { supabase } from "@/lib/supabase";

/**
 * Home in one request. Home starts `home_summary`, and each module's own query reads its rows from
 * that request instead of asking the server again. A module opened on its own still fetches alone,
 * and its query key, columns and order stay the same.
 */

export type HomeParams = {
  p_today: string;
  p_month_start: string;
  p_month_end: string;
  p_done_since: string;
  p_dose_from: string;
  p_dose_to: string;
  p_habits_since: string;
  p_ulam_from: string;
  p_games_from: string;
  p_games_to: string;
};

export type HomeSummary = Record<string, unknown>;

/** The days each module's own query uses, so a summary row is the row that query would get. */
export const DONE_HISTORY_DAYS = 30;
export const HABIT_HISTORY_DAYS = 400;
export const ULAM_WEEK_DAYS = 7;
export const GAME_RESULT_DAYS = 3;
export const GAME_AHEAD_DAYS = 14;

const day = (d: Date) => format(d, "yyyy-MM-dd");

export function homeParams(now: Date): HomeParams {
  const month = startOfMonth(now);
  const today = startOfDay(now);
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    p_today: day(now),
    p_month_start: day(month),
    p_month_end: day(addMonths(month, 1)),
    p_done_since: subDays(now, DONE_HISTORY_DAYS).toISOString(),
    p_dose_from: startOfDay(subDays(now, 1)).toISOString(),
    p_dose_to: endOfDay(addDays(now, 1)).toISOString(),
    p_habits_since: day(subDays(now, HABIT_HISTORY_DAYS)),
    p_ulam_from: day(subDays(today, ULAM_WEEK_DAYS - 1)),
    p_games_from: new Date(now.getTime() - GAME_RESULT_DAYS * dayMs).toISOString(),
    p_games_to: new Date(now.getTime() + GAME_AHEAD_DAYS * dayMs).toISOString(),
  };
}

/** A summary is used while it loads and for this long after, so a slower hook on Home still finds it. */
export const SUMMARY_WINDOW_MS = 15_000;

type Current = {
  params: HomeParams;
  promise: Promise<HomeSummary | null>;
  startedAt: number;
  settledAt: number | null;
};
let current: Current | null = null;

/** True while the summary is loading, or for a short while after it arrives. */
export function isFresh(c: Pick<Current, "settledAt" | "startedAt">, now: number): boolean {
  if (c.settledAt === null) return now - c.startedAt < SUMMARY_WINDOW_MS * 2;
  return now - c.settledAt < SUMMARY_WINDOW_MS;
}

/**
 * Starts one summary request, unless one is loading or just arrived. Home calls it on open and on
 * pull to refresh (`force`), before its module queries run.
 */
export function startHomeSummary(now = new Date(), force = false): void {
  if (!force && current && isFresh(current, now.getTime())) return;
  const params = homeParams(now);
  const entry: Current = { params, startedAt: now.getTime(), settledAt: null, promise: Promise.resolve(null) };
  entry.promise = (async () => {
    try {
      const { data, error } = await supabase.rpc("home_summary", params);
      return error || !data || typeof data !== "object" ? null : (data as HomeSummary);
    } catch {
      return null;
    } finally {
      entry.settledAt = Date.now();
    }
  })();
  current = entry;
}

/** Sign out drops the summary, so the next account never reads it. */
export function clearHomeSummary(): void {
  current = null;
}

/**
 * The rows for one module from the summary, or the module's own request when there is no summary,
 * it failed, or `read` says it does not fit (it returns undefined).
 */
export async function fromHomeSummary<T>(
  read: (summary: HomeSummary, params: HomeParams) => T | undefined,
  fallback: () => Promise<T>,
): Promise<T> {
  const c = current;
  if (c && isFresh(c, Date.now())) {
    const summary = await c.promise;
    if (summary && c === current) {
      const value = read(summary, c.params);
      if (value !== undefined) return value;
    }
  }
  return fallback();
}

/** The value at `key` when the summary has it. Null is a real value, such as no vehicle yet. */
export function slice<T>(summary: HomeSummary, key: string): T | undefined {
  return key in summary ? (summary[key] as T) : undefined;
}
