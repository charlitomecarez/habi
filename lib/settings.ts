import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type UserSettings = {
  timezone: string;
  digestEnabled: boolean;
  digestHour: number;
  /** Module ids pinned to Home, from lib/modules.ts. */
  homeShortcuts: string[];
};

/** The database defaults, used until the first change creates the row. */
const DEFAULTS: UserSettings = {
  timezone: "Asia/Manila",
  digestEnabled: true,
  digestHour: 7,
  homeShortcuts: ["journal", "shopping", "inventory", "vault"],
};

const SETTINGS_KEY = ["user-settings"] as const;

export function useUserSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<UserSettings> => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("timezone, digest_enabled, digest_hour, home_shortcuts")
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULTS;
      return {
        timezone: data.timezone,
        digestEnabled: data.digest_enabled,
        digestHour: data.digest_hour,
        homeShortcuts: data.home_shortcuts,
      };
    },
  });
}

/** Creates the settings row on the first change. The daily digest only reads users that have one. */
export function useSaveUserSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (change: Partial<UserSettings>) => {
      const current = client.getQueryData<UserSettings>(SETTINGS_KEY) ?? DEFAULTS;
      const next = { ...current, ...change };
      const { error } = await supabase.from("user_settings").upsert({
        timezone: next.timezone,
        digest_enabled: next.digestEnabled,
        digest_hour: next.digestHour,
        home_shortcuts: next.homeShortcuts,
      });
      if (error) throw error;
    },
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey: SETTINGS_KEY });
      const previous = client.getQueryData<UserSettings>(SETTINGS_KEY);
      client.setQueryData<UserSettings>(SETTINGS_KEY, { ...(previous ?? DEFAULTS), ...change });
      return { previous };
    },
    onError: (_error, _change, context) => client.setQueryData(SETTINGS_KEY, context?.previous),
    onSettled: () => client.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

/** "7:00 AM" for hour 7. */
export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 === 0 ? 12 : hour % 12}:00 ${suffix}`;
}

/** Time zones to pick from: Manila first, the device's own zone, then a few common ones. */
export function timeZoneOptions(current: string): { value: string; label: string }[] {
  let device: string | undefined;
  try {
    device = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    device = undefined;
  }
  const zones = [
    "Asia/Manila",
    current,
    device,
    "Asia/Singapore",
    "Asia/Tokyo",
    "Asia/Dubai",
    "Australia/Sydney",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "UTC",
  ].filter((z): z is string => Boolean(z));
  return [...new Set(zones)].map((z) => ({ value: z, label: z === device ? `${z} (this device)` : z }));
}
