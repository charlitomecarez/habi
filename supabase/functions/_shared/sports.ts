// Pure Sports rules, shared by the sports-sync function and its tests.

export const FOOTBALL_LEAGUES = ["PL", "PD", "FL1", "BL1", "PPL"] as const;
export type League = (typeof FOOTBALL_LEAGUES)[number] | "NBA";
export type MatchStatus = "scheduled" | "final" | "postponed";

export type MatchRow = {
  league: League;
  external_id: string;
  starts_at: string;
  status: MatchStatus;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  home_crest: string | null;
  away_crest: string | null;
  home_code: string | null;
  away_code: string | null;
};

export type StandingRow = {
  league: League;
  team: string;
  position: number;
  played: number;
  won: number;
  drawn: number | null;
  lost: number;
  points: number | null;
  is_calculated: boolean;
  crest: string | null;
  code: string | null;
};

type FootballTeam = { name: string; shortName?: string | null; tla?: string | null; crest?: string | null };

export type FootballMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: FootballTeam;
  awayTeam: FootballTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
};

export type FootballTableRow = {
  position: number;
  team: FootballTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
};

const teamName = (team: FootballTeam) => team.shortName || team.name;

function footballStatus(status: string): MatchStatus {
  if (status === "FINISHED") return "final";
  if (["POSTPONED", "CANCELLED", "SUSPENDED"].includes(status)) return "postponed";
  return "scheduled";
}

export function footballMatch(league: League, m: FootballMatch): MatchRow {
  const status = footballStatus(m.status);
  const final = status === "final";
  return {
    league,
    external_id: String(m.id),
    starts_at: m.utcDate,
    status,
    home_team: teamName(m.homeTeam),
    away_team: teamName(m.awayTeam),
    home_score: final ? (m.score?.fullTime?.home ?? null) : null,
    away_score: final ? (m.score?.fullTime?.away ?? null) : null,
    home_crest: m.homeTeam.crest ?? null,
    away_crest: m.awayTeam.crest ?? null,
    home_code: m.homeTeam.tla ?? null,
    away_code: m.awayTeam.tla ?? null,
  };
}

export function footballStanding(league: League, r: FootballTableRow): StandingRow {
  return {
    league,
    team: teamName(r.team),
    position: r.position,
    played: r.playedGames,
    won: r.won,
    drawn: r.draw,
    lost: r.lost,
    points: r.points,
    is_calculated: false,
    crest: r.team.crest ?? null,
    code: r.team.tla ?? null,
  };
}

export type NbaGame = {
  id: number;
  date: string;
  datetime?: string | null;
  status: string;
  home_team: { full_name: string; abbreviation?: string | null };
  visitor_team: { full_name: string; abbreviation?: string | null };
  home_team_score: number;
  visitor_team_score: number;
};

function nbaStatus(status: string): MatchStatus {
  if (/^final/i.test(status)) return "final";
  return /postponed|cancel/i.test(status) ? "postponed" : "scheduled";
}

export function nbaMatch(g: NbaGame): MatchRow {
  const status = nbaStatus(g.status);
  const final = status === "final";
  return {
    league: "NBA",
    external_id: String(g.id),
    starts_at: g.datetime ?? g.date,
    status,
    home_team: g.home_team.full_name,
    away_team: g.visitor_team.full_name,
    home_score: final ? g.home_team_score : null,
    away_score: final ? g.visitor_team_score : null,
    home_crest: null,
    away_crest: null,
    home_code: g.home_team.abbreviation ?? null,
    away_code: g.visitor_team.abbreviation ?? null,
  };
}

/**
 * The free balldontlie key has no standings, so this counts wins and losses from stored results.
 * A tie can differ from the official order, and the screen says so.
 */
export function nbaStandings(matches: readonly MatchRow[]): StandingRow[] {
  const teams = new Map<string, { won: number; lost: number; code: string | null }>();
  const add = (team: string, code: string | null, won: boolean) => {
    const row = teams.get(team) ?? { won: 0, lost: 0, code };
    row.code = row.code ?? code;
    if (won) row.won += 1;
    else row.lost += 1;
    teams.set(team, row);
  };
  for (const m of matches) {
    if (m.status !== "final" || m.home_score === null || m.away_score === null) continue;
    add(m.home_team, m.home_code, m.home_score > m.away_score);
    add(m.away_team, m.away_code, m.away_score > m.home_score);
  }
  const rate = (t: { won: number; lost: number }) => t.won / Math.max(t.won + t.lost, 1);
  return [...teams.entries()]
    .sort(([aName, a], [bName, b]) => rate(b) - rate(a) || b.won - a.won || aName.localeCompare(bName))
    .map(([team, t], index) => ({
      league: "NBA",
      team,
      position: index + 1,
      played: t.won + t.lost,
      won: t.won,
      drawn: null,
      lost: t.lost,
      points: null,
      is_calculated: true,
      crest: null,
      code: t.code,
    }));
}
