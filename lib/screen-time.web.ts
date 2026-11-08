// Web: there is no screen time to read, so Home hides the card.

export type AppUsage = { packageName: string; label: string; totalMs: number };
export type DayUsage = { totalMs: number; apps: AppUsage[] };

export const isScreenTimeSupported = false;

export function useUsageAccess(): boolean {
  return false;
}

export function openUsageSettings() {}

export function useScreenTime(_day: Date, _enabled: boolean) {
  return { data: undefined, isPending: false, error: null, refetch: () => {} } as {
    data: { day: DayUsage; weekMs: number; dailyMs: number[] } | undefined;
    isPending: boolean;
    error: Error | null;
    refetch: () => void;
  };
}

export function useWeekUsage(_enabled: boolean) {
  return { data: undefined, isPending: false, error: null, refetch: () => {} } as {
    data: { start: Date; apps: AppUsage[]; totalMs: number; days: number } | undefined;
    isPending: boolean;
    error: Error | null;
    refetch: () => void;
  };
}

/** The web has no screen events, so sleep stays typed. */
export async function readScreenEvents(_startMs: number, _endMs: number): Promise<null> {
  return null;
}
