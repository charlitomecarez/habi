import { useQuery } from "@tanstack/react-query";
import { format, isToday, parseISO } from "date-fns";
import { Linking } from "react-native";

import { fromHomeSummary, slice } from "@/lib/home-summary";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type Match = Tables<"sports_matches">;
export type Standing = Tables<"sports_standings">;
export type LeagueId = "PL" | "PD" | "FL1" | "BL1" | "PPL" | "NBA";

export const LEAGUES: readonly { id: LeagueId; label: string }[] = [
  { id: "PL", label: "Premier League" },
  { id: "PD", label: "La Liga" },
  { id: "FL1", label: "Ligue 1" },
  { id: "BL1", label: "Bundesliga" },
  { id: "PPL", label: "Liga Portugal" },
  { id: "NBA", label: "NBA" },
];

/** A web search for both teams. It needs no match ID, and it works for every league. */
export function matchSearchUrl(match: Pick<Match, "home_team" | "away_team">): string {
  const words = `${match.home_team} vs ${match.away_team}`;
  return `https://www.google.com/search?q=${encodeURIComponent(words)}`;
}

export const openMatch = (match: Match) => Linking.openURL(matchSearchUrl(match));

export type MatchDay = { title: string; matches: Match[] };

/** Groups by day. Results lead with the newest day after the coming days, as in the design. */
export function groupByDay(matches: readonly Match[]): MatchDay[] {
  const days = new Map<string, Match[]>();
  for (const m of matches) {
    const key = format(parseISO(m.starts_at), "yyyy-MM-dd");
    days.set(key, [...(days.get(key) ?? []), m]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({ title: format(parseISO(key), "EEEE, MMM d"), matches: list }));
}

export function matchTitle(m: Match): string {
  return `${m.home_team} vs ${m.away_team}`;
}

export function matchStatus(m: Match): { label: string; tone: "good" | "watch" | "muted" } {
  if (m.status === "final") return { label: "Final", tone: "muted" };
  if (m.status === "postponed") return { label: "Postponed", tone: "watch" };
  return isToday(parseISO(m.starts_at)) ? { label: "Today", tone: "muted" } : { label: "Soon", tone: "muted" };
}

export function useSports(league: LeagueId) {
  return useQuery({
    queryKey: ["sports", league],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [matches, standings, sync] = await Promise.all([
        supabase.from("sports_matches").select("*").eq("league", league).order("starts_at"),
        supabase.from("sports_standings").select("*").eq("league", league).order("position"),
        supabase.from("sports_sync").select("*").eq("league", league).maybeSingle(),
      ]);
      if (matches.error) throw matches.error;
      if (standings.error) throw standings.error;
      if (sync.error) throw sync.error;
      return { matches: matches.data, standings: standings.data, sync: sync.data };
    },
  });
}

// Following teams. A follow is "league:team", for example "PL:Arsenal", with the same team name that
// sports_matches holds. If a feed renames a team, the follow stops matching and the sheet shows it unticked.

export const MAX_FOLLOWED = 12;
/** Results this old or newer show on Home. */
export const RESULT_DAYS = 3;
/** Games shown on Home. */
export const HOME_GAMES = 3;

export const followKey = (league: string, team: string) => `${league}:${team}`;

export function parseFollow(key: string): { league: string; team: string } | null {
  const at = key.indexOf(":");
  if (at < 1 || at === key.length - 1) return null;
  return { league: key.slice(0, at), team: key.slice(at + 1) };
}

/** Adds or removes a team. Adds nothing past the limit. */
export function toggleFollow(list: readonly string[], key: string, max = MAX_FOLLOWED): string[] {
  if (list.includes(key)) return list.filter((k) => k !== key);
  return list.length >= max ? [...list] : [...list, key];
}

/**
 * For each followed team, its last result from the past 3 days and its next match. A game between two
 * followed teams shows once. Soonest to now first, at most 3.
 */
export function latestGames(
  matches: readonly Match[],
  follows: readonly string[],
  now = new Date(),
  limit = HOME_GAMES,
): Match[] {
  const since = now.getTime() - RESULT_DAYS * 24 * 60 * 60 * 1000;
  const picked = new Map<string, Match>();
  for (const key of follows) {
    const follow = parseFollow(key);
    if (!follow) continue;
    const mine = matches.filter(
      (m) => m.league === follow.league && (m.home_team === follow.team || m.away_team === follow.team),
    );
    const last = mine
      .filter((m) => m.status === "final" && Date.parse(m.starts_at) >= since)
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
    const next = mine
      .filter((m) => m.status === "scheduled" && Date.parse(m.starts_at) >= now.getTime() - 3 * 60 * 60 * 1000)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    for (const m of [last, next]) if (m) picked.set(`${m.league}:${m.external_id}`, m);
  }
  const gap = (m: Match) => Math.abs(Date.parse(m.starts_at) - now.getTime());
  return [...picked.values()].sort((a, b) => gap(a) - gap(b)).slice(0, limit);
}

/** The followed teams' games from the last 3 days and the next 14, for Home. */
export function useFollowedGames(follows: readonly string[]) {
  const leagues = [...new Set(follows.map((k) => parseFollow(k)?.league).filter((l): l is string => !!l))];
  return useQuery({
    queryKey: ["sports", "followed", [...follows].sort().join(",")],
    enabled: leagues.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const data = await fromHomeSummary(
        // The summary reads the follows saved on the server. Use it only when they are the same leagues.
        (s) =>
          JSON.stringify(slice<string[]>(s, "game_leagues")) === JSON.stringify([...leagues].sort())
            ? slice<Match[]>(s, "games")
            : undefined,
        async () => {
          const now = Date.now();
          const { data, error } = await supabase
            .from("sports_matches")
            .select("*")
            .in("league", leagues)
            .gte("starts_at", new Date(now - RESULT_DAYS * 24 * 60 * 60 * 1000).toISOString())
            .lte("starts_at", new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString())
            .order("starts_at");
          if (error) throw error;
          return data;
        },
      );
      return latestGames(data, follows);
    },
  });
}

/** Every team in a league, A to Z, with its mark, from the standings. */
export function useLeagueTeams(league: LeagueId) {
  return useQuery({
    queryKey: ["sports", "teams", league],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sports_standings")
        .select("team, crest, code")
        .eq("league", league)
        .order("team");
      if (error) throw error;
      return data;
    },
  });
}
