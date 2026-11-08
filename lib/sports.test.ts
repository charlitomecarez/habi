import { describe, expect, it, vi } from "vitest";

import {
  followKey,
  groupByDay,
  latestGames,
  matchSearchUrl,
  matchStatus,
  matchTitle,
  MAX_FOLLOWED,
  parseFollow,
  toggleFollow,
  type Match,
} from "@/lib/sports";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("react-native", () => ({ Linking: {} }));

const match = (over: Partial<Match> = {}): Match => ({
  league: "PL",
  external_id: "1",
  starts_at: "2026-11-07T12:30:00Z",
  status: "scheduled",
  home_team: "Team A",
  away_team: "Team B",
  home_score: null,
  away_score: null,
  home_crest: null,
  away_crest: null,
  home_code: null,
  away_code: null,
  updated_at: "2026-11-07T00:00:00Z",
  ...over,
});

describe("matches", () => {
  it("searches for both teams", () => {
    expect(matchSearchUrl(match())).toBe("https://www.google.com/search?q=Team%20A%20vs%20Team%20B");
  });

  it("shows the score only for a final match", () => {
    expect(matchTitle(match())).toBe("Team A vs Team B");
    expect(matchTitle(match({ status: "final", home_score: 2, away_score: 1 }))).toBe("Team A vs Team B");
  });

  it("says Final and Postponed in words", () => {
    expect(matchStatus(match({ status: "final" })).label).toBe("Final");
    expect(matchStatus(match({ status: "postponed" })).label).toBe("Postponed");
  });

  it("groups by day in order", () => {
    const days = groupByDay([
      match({ starts_at: "2026-11-08T03:00:00Z" }),
      match({ starts_at: "2026-11-07T03:00:00Z" }),
    ]);
    expect(days).toHaveLength(2);
    expect(days[0].matches[0].starts_at).toBe("2026-11-07T03:00:00Z");
  });
});

describe("following", () => {
  const now = new Date("2026-11-08T06:00:00Z");
  const games = [
    match({ external_id: "old", home_team: "Arsenal", status: "final", starts_at: "2026-11-01T12:00:00Z" }),
    match({ external_id: "won", home_team: "Arsenal", status: "final", starts_at: "2026-11-07T12:00:00Z" }),
    match({ external_id: "next", away_team: "Arsenal", starts_at: "2026-11-10T12:00:00Z" }),
    match({ external_id: "later", home_team: "Arsenal", starts_at: "2026-11-20T12:00:00Z" }),
    match({ external_id: "lakers", league: "NBA", home_team: "Lakers", starts_at: "2026-11-08T08:30:00Z" }),
  ];

  it("reads league:team", () => {
    expect(followKey("PL", "Arsenal")).toBe("PL:Arsenal");
    expect(parseFollow("PL:Brighton & Hove Albion")).toEqual({ league: "PL", team: "Brighton & Hove Albion" });
    expect(parseFollow("Arsenal")).toBeNull();
    expect(parseFollow("PL:")).toBeNull();
  });

  it("adds and removes, and stops at 12", () => {
    expect(toggleFollow([], "PL:Arsenal")).toEqual(["PL:Arsenal"]);
    expect(toggleFollow(["PL:Arsenal"], "PL:Arsenal")).toEqual([]);
    const full = Array.from({ length: MAX_FOLLOWED }, (_, i) => `PL:Team ${i}`);
    expect(toggleFollow(full, "PL:Arsenal")).toEqual(full);
  });

  it("shows the last result and the next match, soonest to now first", () => {
    const ids = latestGames(games, ["PL:Arsenal", "NBA:Lakers"], now).map((m) => m.external_id);
    expect(ids).toEqual(["lakers", "won", "next"]);
  });

  it("drops a result older than 3 days and a team in another league", () => {
    expect(latestGames(games.slice(0, 1), ["PL:Arsenal"], now)).toEqual([]);
    expect(latestGames(games, ["PD:Arsenal"], now)).toEqual([]);
  });

  it("shows a game between two followed teams once", () => {
    const derby = [
      match({ external_id: "d", home_team: "Arsenal", away_team: "Chelsea", starts_at: "2026-11-09T12:00:00Z" }),
    ];
    expect(latestGames(derby, ["PL:Arsenal", "PL:Chelsea"], now)).toHaveLength(1);
  });
});
