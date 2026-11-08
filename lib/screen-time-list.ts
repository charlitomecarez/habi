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
