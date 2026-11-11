// Pure F1 and MotoGP rules, shared by the sports-sync function and its tests.
// F1 comes from Jolpica (api.jolpi.ca), and MotoGP from the public motogp.com results API.

export type Series = "F1" | "MGP";
export type RaceStatus = "scheduled" | "final" | "cancelled";

export type RaceRow = {
  series: Series;
  season: number;
  round: number;
  name: string;
  circuit: string;
  country: string;
  starts_at: string;
  sprint_at: string | null;
  status: RaceStatus;
};

export type ResultRow = {
  series: Series;
  season: number;
  round: number;
  position: number;
  name: string;
  team: string;
  points: number;
};

export type MotorStandingRow = {
  series: Series;
  kind: "rider" | "team";
  position: number;
  name: string;
  team: string | null;
  points: number;
  wins: number;
};

/** The top 10 of a race. */
export const RESULT_ROWS = 10;
const HOUR_MS = 60 * 60 * 1000;

// ---- F1 (Jolpica) -----------------------------------------------------------------------------------

type JolpicaTime = { date: string; time?: string };
export type JolpicaRace = JolpicaTime & {
  season: string;
  round: string;
  raceName: string;
  Circuit: { circuitName: string; Location: { country: string } };
  Sprint?: JolpicaTime;
  Results?: JolpicaResult[];
};
type JolpicaDriver = { givenName: string; familyName: string };
type JolpicaConstructor = { name: string };
export type JolpicaResult = {
  position: string;
  points: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
};
export type JolpicaDriverStanding = {
  position?: string;
  positionText?: string;
  points: string;
  wins: string;
  Driver: JolpicaDriver;
  Constructors: JolpicaConstructor[];
};
export type JolpicaTeamStanding = {
  position?: string;
  positionText?: string;
  points: string;
  wins: string;
  Constructor: JolpicaConstructor;
};

/** A date with no time counts as noon UTC, so it stays on the same day in the Philippines. */
const at = (t: JolpicaTime) => new Date(`${t.date}T${t.time ?? "12:00:00Z"}`).toISOString();
const driverName = (d: JolpicaDriver) => `${d.givenName} ${d.familyName}`;

/** The season's rounds. A round up to the last one with results is final. */
export function f1Races(races: JolpicaRace[], lastFinalRound: number): RaceRow[] {
  return races.map((r) => ({
    series: "F1",
    season: Number(r.season),
    round: Number(r.round),
    name: r.raceName,
    circuit: r.Circuit.circuitName,
    country: r.Circuit.Location.country,
    starts_at: at(r),
    sprint_at: r.Sprint ? at(r.Sprint) : null,
    status: Number(r.round) <= lastFinalRound ? "final" : "scheduled",
  }));
}

export function f1Results(race: JolpicaRace): ResultRow[] {
  return (race.Results ?? []).slice(0, RESULT_ROWS).map((r) => ({
    series: "F1",
    season: Number(race.season),
    round: Number(race.round),
    position: Number(r.position),
    name: driverName(r.Driver),
    team: r.Constructor.name,
    points: Number(r.points),
  }));
}

/** A driver with no classified place gets the next place in the list. */
const place = (row: { position?: string }, index: number) => Number(row.position ?? index + 1) || index + 1;

export function f1DriverStandings(rows: JolpicaDriverStanding[]): MotorStandingRow[] {
  return rows.map((r, i) => ({
    series: "F1",
    kind: "rider",
    position: place(r, i),
    name: driverName(r.Driver),
    team: r.Constructors.at(-1)?.name ?? null,
    points: Number(r.points),
    wins: Number(r.wins),
  }));
}

export function f1TeamStandings(rows: JolpicaTeamStanding[]): MotorStandingRow[] {
  return rows.map((r, i) => ({
    series: "F1",
    kind: "team",
    position: place(r, i),
    name: r.Constructor.name,
    team: null,
    points: Number(r.points),
    wins: Number(r.wins),
  }));
}

// ---- MotoGP -----------------------------------------------------------------------------------------

export type MgpEvent = {
  id: string;
  name: string;
  date_start: string;
  test: boolean;
  status: string;
  circuit?: { name?: string } | null;
  country?: { name?: string } | null;
};
export type MgpSession = { id: string; type: string; date: string; status: string };
export type MgpClassification = {
  position: number | null;
  points?: number | null;
  rider?: { full_name?: string } | null;
  team?: { name?: string } | null;
};
export type MgpStanding = {
  position: number;
  points: number;
  race_wins?: number | null;
  rider?: { full_name?: string } | null;
  team?: { name?: string } | null;
};

const SMALL_WORDS = new Set(["of", "the", "de", "and"]);

/** "GRAND PRIX OF THE UNITED STATES" → "Grand Prix of the United States". */
export function titleCase(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** The race events of a season in date order. Tests are not races. */
export function mgpRaceEvents(events: MgpEvent[]): MgpEvent[] {
  return events.filter((e) => !e.test).sort((a, b) => a.date_start.localeCompare(b.date_start));
}

/** One round for each race event. The main race session gives the start time, and the sprint its own. */
export function mgpRace(event: MgpEvent, round: number, season: number, sessions: MgpSession[]): RaceRow {
  const race = sessions.find((s) => s.type === "RAC");
  const sprint = sessions.find((s) => s.type === "SPR");
  const status: RaceStatus = /CANCEL/i.test(event.status)
    ? "cancelled"
    : event.status === "FINISHED" || race?.status === "FINISHED"
      ? "final"
      : "scheduled";
  return {
    series: "MGP",
    season,
    round,
    name: titleCase(event.name),
    circuit: event.circuit?.name ?? "",
    country: event.country?.name ?? "",
    starts_at: new Date(race?.date ?? `${event.date_start}T12:00:00Z`).toISOString(),
    sprint_at: sprint ? new Date(sprint.date).toISOString() : null,
    status,
  };
}

export function mgpResults(rows: MgpClassification[], season: number, round: number): ResultRow[] {
  return rows
    .filter((r) => r.position !== null && r.position <= RESULT_ROWS)
    .map((r) => ({
      series: "MGP",
      season,
      round,
      position: r.position!,
      name: r.rider?.full_name ?? "",
      team: r.team?.name ?? "",
      points: r.points ?? 0,
    }));
}

export function mgpRiderStandings(rows: MgpStanding[]): MotorStandingRow[] {
  return rows.map((r) => ({
    series: "MGP",
    kind: "rider",
    position: r.position,
    name: r.rider?.full_name ?? "",
    team: r.team?.name ?? null,
    points: r.points,
    wins: r.race_wins ?? 0,
  }));
}

/** The MotoGP API has no team table, so a team's points are its riders' points. */
export function mgpTeamStandings(rows: MgpStanding[]): MotorStandingRow[] {
  const teams = new Map<string, { points: number; wins: number }>();
  for (const r of rows) {
    const name = r.team?.name;
    if (!name) continue;
    const team = teams.get(name) ?? { points: 0, wins: 0 };
    team.points += r.points;
    team.wins += r.race_wins ?? 0;
    teams.set(name, team);
  }
  return [...teams.entries()]
    .sort(([, a], [, b]) => b.points - a.points || b.wins - a.wins)
    .map(([name, t], i) => ({ series: "MGP", kind: "team", position: i + 1, name, team: null, ...t }));
}

// ---- When to call the sources -----------------------------------------------------------------------

/**
 * The cron runs every 2 hours. It calls the sources at 7 AM PHT, or when a race starts in the next
 * 72 hours, or started in the last 8 hours (a race runs about 2 hours, so it ended up to 6 hours ago).
 */
export function motorDue(now: number, starts: readonly string[]): boolean {
  if (new Date(now + 8 * HOUR_MS).getUTCHours() === 7) return true;
  return starts.some((s) => {
    const t = Date.parse(s);
    return t <= now + 72 * HOUR_MS && t >= now - 8 * HOUR_MS;
  });
}
