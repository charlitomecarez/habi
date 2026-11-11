import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { Linking } from "react-native";

import { fromHomeSummary, slice } from "@/lib/home-summary";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

// F1 and MotoGP. sports-sync fills these shared tables; the app only reads them. Times show in the
// phone's time zone, which is PHT for this app's users.

export type SeriesId = "F1" | "MGP";
export type MotorRace = Tables<"motor_races">;
export type MotorResult = Tables<"motor_results">;
export type MotorStanding = Tables<"motor_standings">;
/** A race from the Home summary, with the winner of a finished race. */
export type HomeRace = Pick<MotorRace, "series" | "season" | "round" | "name" | "starts_at" | "status"> & {
  winner: string | null;
};

export const SERIES: readonly { id: SeriesId; label: string; people: "Drivers" | "Riders" }[] = [
  { id: "F1", label: "F1", people: "Drivers" },
  { id: "MGP", label: "MotoGP", people: "Riders" },
];

export const isSeries = (id: string): id is SeriesId => id === "F1" || id === "MGP";
export const seriesLabel = (id: string) => SERIES.find((s) => s.id === id)?.label ?? id;

const HOUR_MS = 60 * 60 * 1000;
/** A race shows on Home this many days before it starts. */
export const RACE_AHEAD_DAYS = 7;
/** The winner shows on Home this many days after the race. */
export const WINNER_DAYS = 3;
/** A race stays "next" until 3 hours after its start, while it runs. */
const RUNNING_MS = 3 * HOUR_MS;

/** "Sun, Nov 29 · 12:00 AM". */
export function raceWhen(startsAt: string): string {
  return format(parseISO(startsAt), "EEE, MMM d · h:mm a");
}

/**
 * A second line for a race between midnight and 6 AM, so you plan for the right night:
 * "Saturday night, at midnight", "Saturday night, after midnight" or "Sunday, before dawn".
 */
export function lateNightLine(startsAt: string): string | null {
  const at = parseISO(startsAt);
  const hour = at.getHours();
  if (hour >= 6) return null;
  const night = format(subDays(at, 1), "EEEE");
  if (hour === 0) return at.getMinutes() === 0 ? `${night} night, at midnight` : `${night} night, after midnight`;
  return `${format(at, "EEEE")}, before dawn`;
}

/** The race that is next or running. Null between seasons. */
export function nextRace<T extends Pick<MotorRace, "starts_at" | "status">>(
  races: readonly T[],
  now = new Date(),
): T | null {
  const from = now.getTime() - RUNNING_MS;
  return races.find((r) => r.status === "scheduled" && Date.parse(r.starts_at) >= from) ?? null;
}

/** The last finished race. */
export function lastRace<T extends Pick<MotorRace, "status">>(races: readonly T[]): T | null {
  return races.filter((r) => r.status === "final").at(-1) ?? null;
}

/** A web search for the race, like a match today. */
export function raceSearchUrl(race: Pick<MotorRace, "series" | "season" | "name">): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${seriesLabel(race.series)} ${race.season} ${race.name}`)}`;
}

export const openRace = (race: Pick<MotorRace, "series" | "season" | "name">) => Linking.openURL(raceSearchUrl(race));

/** One series: the latest season's rounds, the last race's top 10, the standings and the sync times. */
export function useMotor(series: SeriesId, enabled = true) {
  return useQuery({
    queryKey: ["sports", "motor", series],
    enabled,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [races, results, standings, sync] = await Promise.all([
        supabase.from("motor_races").select("*").eq("series", series).order("starts_at"),
        supabase
          .from("motor_results")
          .select("*")
          .eq("series", series)
          .order("season", { ascending: false })
          .order("round", { ascending: false })
          .order("position")
          .limit(10),
        supabase.from("motor_standings").select("*").eq("series", series).order("position"),
        supabase.from("sports_sync").select("*").eq("league", series).maybeSingle(),
      ]);
      if (races.error) throw races.error;
      if (results.error) throw results.error;
      if (standings.error) throw standings.error;
      if (sync.error) throw sync.error;
      const season = Math.max(0, ...races.data.map((r) => r.season));
      const top = results.data.filter(
        (r) => r.season === results.data[0]?.season && r.round === results.data[0]?.round,
      );
      return {
        races: races.data.filter((r) => r.season === season),
        results: top,
        riders: standings.data.filter((s) => s.kind === "rider"),
        teams: standings.data.filter((s) => s.kind === "team"),
        sync: sync.data,
      };
    },
  });
}

export type HomeRaceItem = { race: HomeRace; result: boolean };

/**
 * For each followed series: the next race in the 7 days before it, else the winner of a race in the
 * 3 days after it.
 */
export function homeRaces(races: readonly HomeRace[], series: readonly string[], now = new Date()): HomeRaceItem[] {
  const t = now.getTime();
  const items: HomeRaceItem[] = [];
  for (const id of series) {
    const mine = races.filter((r) => r.series === id && r.status !== "cancelled");
    const next = nextRace(mine, now);
    if (next && Date.parse(next.starts_at) <= t + RACE_AHEAD_DAYS * 24 * HOUR_MS) {
      items.push({ race: next, result: false });
      continue;
    }
    const last = lastRace(mine);
    if (last?.winner && Date.parse(last.starts_at) >= t - WINNER_DAYS * 24 * HOUR_MS) {
      items.push({ race: last, result: true });
    }
  }
  return items;
}

/** The races of the followed series, for Home. */
export function useFollowedRaces(series: readonly string[]) {
  const ids = [...series].filter(isSeries).sort();
  return useQuery({
    queryKey: ["sports", "motor", "followed", ids.join(",")],
    enabled: ids.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const races = await fromHomeSummary(
        // The summary reads the series saved on the server. Use it only when they are the same series.
        (s) => {
          const saved = slice<{ followed_series?: string[] } | null>(s, "settings")?.followed_series ?? [];
          return [...saved].sort().join(",") === ids.join(",") ? slice<HomeRace[]>(s, "races") : undefined;
        },
        async (): Promise<HomeRace[]> => {
          const now = Date.now();
          const [list, winners] = await Promise.all([
            supabase
              .from("motor_races")
              .select("series, season, round, name, starts_at, status")
              .in("series", ids)
              .gte("starts_at", new Date(now - WINNER_DAYS * 24 * HOUR_MS).toISOString())
              .lte("starts_at", new Date(now + RACE_AHEAD_DAYS * 24 * HOUR_MS).toISOString())
              .order("starts_at"),
            supabase.from("motor_results").select("series, season, round, name").in("series", ids).eq("position", 1),
          ]);
          if (list.error) throw list.error;
          if (winners.error) throw winners.error;
          const key = (r: { series: string; season: number; round: number }) => `${r.series}:${r.season}:${r.round}`;
          const byRace = new Map(winners.data.map((w) => [key(w), w.name]));
          return list.data.map((r) => ({ ...r, winner: byRace.get(key(r)) ?? null }));
        },
      );
      return homeRaces(races, ids);
    },
  });
}
