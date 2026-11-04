// Web: there is no screen time to read, so Home hides the card.

export type AppUsage = { packageName: string; label: string; totalMs: number };
export type DayUsage = { totalMs: number; apps: AppUsage[] };

export const isScreenTimeSupported = false;

export function useUsageAccess(): boolean {
  return false;
}

export function openUsageSettings() {}

export function useScreenTime(_day: Date, _enabled: boolean) {
  return { data: undefined, isPending: false, error: null } as {
    data: { day: DayUsage; weekMs: number } | undefined;
    isPending: boolean;
    error: Error | null;
  };
}
