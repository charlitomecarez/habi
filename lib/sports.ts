import { useQuery } from "@tanstack/react-query";
import { format, isToday, parseISO } from "date-fns";
import { Linking } from "react-native";

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
  return m.status === "final"
    ? `${m.home_team} ${m.home_score}–${m.away_score} ${m.away_team}`
    : `${m.home_team} vs ${m.away_team}`;
}

export function matchStatus(m: Match): { label: string; tone: "good" | "watch" | "muted" } {
  if (m.status === "final") return { label: "Final", tone: "muted" };
  if (m.status === "postponed") return { label: "Postponed", tone: "watch" };
  return isToday(parseISO(m.starts_at)) ? { label: "Today", tone: "good" } : { label: "Soon", tone: "muted" };
}

export function useSports(league: LeagueId) {
  return useQuery({
    queryKey: ["sports", league],
    staleTime: 10 * 60 * 1000,
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
