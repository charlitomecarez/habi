import { describe, expect, it } from "vitest";

import { footballMatch, footballStanding, nbaMatch, nbaStandings, type MatchRow } from "./sports";

// Every team here is made up.
const team = (name: string) => ({ name, shortName: name });

describe("footballMatch", () => {
  const match = {
    id: 7,
    utcDate: "2026-11-07T12:30:00Z",
    homeTeam: team("Team A"),
    awayTeam: team("Team B"),
    score: { fullTime: { home: 2, away: 1 } },
  };

  it("keeps the score of a finished match", () => {
    expect(footballMatch("PL", { ...match, status: "FINISHED" })).toMatchObject({
      external_id: "7",
      status: "final",
      home_score: 2,
      away_score: 1,
    });
  });

  it("shows no score before the end, because the app has no live scores", () => {
    expect(footballMatch("PL", { ...match, status: "IN_PLAY" })).toMatchObject({
      status: "scheduled",
      home_score: null,
    });
  });

  it("marks a postponed match", () => {
    expect(footballMatch("PL", { ...match, status: "POSTPONED" }).status).toBe("postponed");
  });
});

describe("footballStanding", () => {
  it("maps a table row", () => {
    const row = { position: 1, team: team("Team A"), playedGames: 10, won: 8, draw: 1, lost: 1, points: 25 };
    expect(footballStanding("PL", row)).toMatchObject({ played: 10, drawn: 1, points: 25, is_calculated: false });
  });
});

describe("nbaMatch", () => {
  const game = {
    id: 9,
    date: "2026-11-07",
    home_team: { full_name: "Team C" },
    visitor_team: { full_name: "Team D" },
    home_team_score: 101,
    visitor_team_score: 99,
  };

  it("reads a final game", () => {
    expect(nbaMatch({ ...game, status: "Final" })).toMatchObject({ status: "final", home_score: 101 });
  });

  it("treats a tip-off time as scheduled", () => {
    expect(nbaMatch({ ...game, status: "2026-11-07T00:30:00Z" })).toMatchObject({
      status: "scheduled",
      home_score: null,
    });
  });
});

describe("nbaStandings", () => {
  const final = (home: string, away: string, h: number, a: number): MatchRow => ({
    league: "NBA",
    external_id: `${home}-${away}-${h}`,
    starts_at: "2026-11-01",
    status: "final",
    home_team: home,
    away_team: away,
    home_score: h,
    away_score: a,
  });

  it("orders by win rate and marks the order as calculated", () => {
    const rows = nbaStandings([final("C", "D", 100, 90), final("C", "E", 100, 90), final("E", "D", 100, 90)]);
    expect(rows.map((r) => r.team)).toEqual(["C", "E", "D"]);
    expect(rows[0]).toMatchObject({ position: 1, won: 2, lost: 0, played: 2, is_calculated: true });
    expect(rows[2]).toMatchObject({ won: 0, lost: 2 });
  });

  it("ignores a game that is not final", () => {
    const later = { ...final("C", "D", 0, 0), status: "scheduled" as const, home_score: null, away_score: null };
    expect(nbaStandings([later])).toEqual([]);
  });
});
