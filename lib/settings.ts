import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fromHomeSummary, slice } from "@/lib/home-summary";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type UserSettings = {
  timezone: string;
  digestEnabled: boolean;
  digestHour: number;
  /** Module ids pinned to Home, from lib/modules.ts. */
  homeShortcuts: string[];
  /** The most one ulam can cost. */
  ulamLimit: number;
  /** Food you never eat, for the daily ulam. */
  ulamAvoid: string[];
  /** Teams whose games show on Home, as league:team, for example PL:Arsenal. At most 12. */
  followedTeams: string[];
  /** F1 and MotoGP series whose next race and winner show on Home. Not part of the 12-team limit. */
  followedSeries: string[];
  /** Modules switched off in Settings › Modules, by id from lib/modules.ts. */
  hiddenModules: string[];
  /** The 6 PM health check. Off until you turn it on; while on, sleep and steps go to your account. */
  healthCheck: boolean;
};

/** The database defaults, used until the first change creates the row. */
const DEFAULTS: UserSettings = {
  timezone: "Asia/Manila",
  digestEnabled: true,
  digestHour: 7,
  homeShortcuts: ["journal", "shopping", "inventory", "vault"],
  ulamLimit: 99,
  ulamAvoid: [],
  followedTeams: [],
  followedSeries: [],
  hiddenModules: [],
  healthCheck: false,
};

const SETTINGS_KEY = ["user-settings"] as const;

export function useUserSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<UserSettings> => {
      type Row = Pick<
        Tables<"user_settings">,
        | "timezone"
        | "digest_enabled"
        | "digest_hour"
        | "home_shortcuts"
        | "ulam_limit"
        | "ulam_avoid"
        | "followed_teams"
        | "followed_series"
        | "hidden_modules"
        | "health_check"
      >;
      const data = await fromHomeSummary(
        (s) => slice<Row | null>(s, "settings"),
        async () => {
          const { data, error } = await supabase
            .from("user_settings")
            .select(
              "timezone, digest_enabled, digest_hour, home_shortcuts, ulam_limit, ulam_avoid, followed_teams, followed_series, hidden_modules, health_check",
            )
            .maybeSingle();
          if (error) throw error;
          return data;
        },
      );
      if (!data) return DEFAULTS;
      return {
        timezone: data.timezone,
        digestEnabled: data.digest_enabled,
        digestHour: data.digest_hour,
        homeShortcuts: data.home_shortcuts,
        ulamLimit: data.ulam_limit,
        ulamAvoid: data.ulam_avoid,
        followedTeams: data.followed_teams,
        // A summary from before v1.6.0 has no followed_series.
        followedSeries: data.followed_series ?? [],
        hiddenModules: data.hidden_modules,
        // A summary from before v1.5.0 milestone 9 has no health_check.
        healthCheck: data.health_check ?? false,
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
        ulam_limit: next.ulamLimit,
        ulam_avoid: next.ulamAvoid,
        followed_teams: next.followedTeams,
        followed_series: next.followedSeries,
        hidden_modules: next.hiddenModules,
        health_check: next.healthCheck,
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
