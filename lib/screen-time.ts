import { useQuery } from "@tanstack/react-query";
import { addDays, startOfDay, subDays } from "date-fns";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { ScreenTimeModule, type AppUsage } from "@/modules/screen-time";

// Android: screen time from UsageStatsManager through the local screen-time module.
// The data stays on the phone. Nothing goes to Supabase.

export type { AppUsage };
export type DayUsage = { totalMs: number; apps: AppUsage[] };

export const isScreenTimeSupported = ScreenTimeModule !== null;

/** True when "Usage access" is on. Checks again when you come back from Settings. */
export function useUsageAccess(): boolean {
  const [access, setAccess] = useState(() => ScreenTimeModule?.hasAccess() ?? false);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setAccess(ScreenTimeModule?.hasAccess() ?? false);
    });
    return () => sub.remove();
  }, []);
  return access;
}

export function openUsageSettings() {
  ScreenTimeModule?.openSettings();
}

async function usage(day: Date): Promise<DayUsage> {
  const start = startOfDay(day);
  const apps = (await ScreenTimeModule?.getUsage(start.getTime(), addDays(start, 1).getTime())) ?? [];
  return { totalMs: apps.reduce((s, a) => s + a.totalMs, 0), apps };
}

/** One day's screen time, and the 7 days ending that day. */
export function useScreenTime(day: Date, enabled: boolean) {
  const key = startOfDay(day).toISOString();
  return useQuery({
    queryKey: ["screen-time", key],
    enabled: enabled && isScreenTimeSupported,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const days = await Promise.all(Array.from({ length: 7 }, (_, i) => usage(subDays(day, i))));
      // Oldest first, for the chart.
      return {
        day: days[0],
        weekMs: days.reduce((s, d) => s + d.totalMs, 0),
        dailyMs: days.map((d) => d.totalMs).reverse(),
      };
    },
  });
}
