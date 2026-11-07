import { describe, expect, it, vi } from "vitest";

import { groupByDay, matchSearchUrl, matchStatus, matchTitle, type Match } from "@/lib/sports";

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
  updated_at: "2026-11-07T00:00:00Z",
  ...over,
});

describe("matches", () => {
  it("searches for both teams", () => {
    expect(matchSearchUrl(match())).toBe("https://www.google.com/search?q=Team%20A%20vs%20Team%20B");
  });

  it("shows the score only for a final match", () => {
    expect(matchTitle(match())).toBe("Team A vs Team B");
    expect(matchTitle(match({ status: "final", home_score: 2, away_score: 1 }))).toBe("Team A 2–1 Team B");
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
