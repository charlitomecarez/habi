// Pure helpers for the screen time list. They need no React Native, so the tests can run them.

export type UsageRow = { packageName: string; label: string; totalMs: number };

/** "2 h 15 min", "45 min", "under a minute" */
export function duration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "under a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/** Apps under this fold into one last row, so the list stays short. */
export const FOLD_UNDER_MS = 60_000;

/**
 * Every app, longest first, with its bar as a share of the longest app. Apps under a minute
 * fold into one row with their count and their time added up.
 */
export function appList(apps: readonly UsageRow[]): {
  rows: (UsageRow & { share: number })[];
  folded: { count: number; totalMs: number } | null;
} {
  const sorted = apps.filter((a) => a.totalMs > 0).sort((a, b) => b.totalMs - a.totalMs);
  const longest = Math.max(sorted[0]?.totalMs ?? 0, 1);
  const shown = sorted.filter((a) => a.totalMs >= FOLD_UNDER_MS);
  const small = sorted.filter((a) => a.totalMs < FOLD_UNDER_MS);
  return {
    rows: shown.map((a) => ({ ...a, share: a.totalMs / longest })),
    folded: small.length ? { count: small.length, totalMs: small.reduce((s, a) => s + a.totalMs, 0) } : null,
  };
}

/** Adds up the time of each app over several days. */
export function sumApps(days: readonly (readonly UsageRow[])[]): UsageRow[] {
  const byApp = new Map<string, UsageRow>();
  for (const day of days)
    for (const a of day) {
      const row = byApp.get(a.packageName) ?? { ...a, totalMs: 0 };
      row.totalMs += a.totalMs;
      byApp.set(a.packageName, row);
    }
  return [...byApp.values()];
}

/**
 * The daily guide for phone use: 3 hours. Health sources give adults 2 to 3 hours of personal screen
 * time a day. There is no official limit for adults.
 */
export const GUIDE_MS = 3 * 60 * 60 * 1000;
/** From 5 hours a day, an OECD analysis links personal screen use with worse well-being. */
export const HIGH_MS = 5 * 60 * 60 * 1000;

export type UsageStatus = { label: "Within guide" | "Above guide" | "High"; tone: "good" | "watch" | "over" };

/** The status word for one day of phone use. */
export function usageStatus(ms: number): UsageStatus {
  if (ms <= GUIDE_MS) return { label: "Within guide", tone: "good" };
  if (ms < HIGH_MS) return { label: "Above guide", tone: "watch" };
  return { label: "High", tone: "over" };
}

/** "1 h 20 min left of the 3 h guide", or "40 min over the 3 h guide". */
export function guideText(ms: number): string {
  const guide = duration(GUIDE_MS);
  return ms <= GUIDE_MS
    ? `${duration(GUIDE_MS - ms)} left of the ${guide} guide`
    : `${duration(ms - GUIDE_MS)} over the ${guide} guide`;
}
