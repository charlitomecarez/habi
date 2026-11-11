// Runs at 7 AM and 3 PM PHT from pg_cron (see migration 20261106000400). It stores matches and
// standings, so the app never calls a sports API and the keys stay here. A failed league keeps its
// last good rows.
//
// With the body {"only":"motor"} it syncs F1 and MotoGP instead (cron motor-sync, every 2 hours, see
// migration 20261111000200). Those sources need no key. A run calls them only at 7 AM PHT or near a
// race (see motorDue). A failed series keeps its last rows and never stops the other one.
//
// Secrets (dashboard): CRON_SECRET, FOOTBALL_DATA_KEY, BALLDONTLIE_KEY.
// Limits: football-data.org 10 calls a minute, balldontlie 5 calls a minute. The two run side by side.
// Jolpica allows about 500 calls an hour. The MotoGP API has no documented limit.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  FOOTBALL_LEAGUES,
  footballMatch,
  footballStanding,
  nbaMatch,
  nbaStandings,
  type FootballMatch,
  type FootballTableRow,
  type League,
  type MatchRow,
  type NbaGame,
} from "../_shared/sports.ts";
import {
  f1DriverStandings,
  f1Races,
  f1Results,
  f1TeamStandings,
  mgpRace,
  mgpRaceEvents,
  mgpResults,
  mgpRiderStandings,
  mgpTeamStandings,
  motorDue,
  type JolpicaDriverStanding,
  type JolpicaRace,
  type JolpicaTeamStanding,
  type MgpClassification,
  type MgpEvent,
  type MgpSession,
  type MgpStanding,
  type MotorStandingRow,
  type RaceRow,
  type ResultRow,
  type Series,
} from "../_shared/motor.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 14;
/** NBA standings count stored results, so the sync reaches further back and keeps the season. */
const NBA_BACK_DAYS = 21;
const NBA_KEEP_DAYS = 300;
const FOOTBALL_GAP_MS = 7000;
const NBA_GAP_MS = 13000;
const MAX_NBA_PAGES = 4;

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  // Jolpica can take over 5 seconds, so a call gets 30.
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} ${res.status}`);
  return (await res.json()) as T;
}

async function mark(supabase: SupabaseClient, league: League | Series, ok: boolean) {
  const now = new Date().toISOString();
  await supabase
    .from("sports_sync")
    .upsert({ league, ...(ok ? { last_ok_at: now } : { last_error_at: now }) }, { onConflict: "league" });
}

async function syncFootball(supabase: SupabaseClient, key: string, now: number) {
  const headers = { "X-Auth-Token": key };
  const base = "https://api.football-data.org/v4/competitions";
  for (const league of FOOTBALL_LEAGUES) {
    try {
      const from = day(now - WINDOW_DAYS * DAY_MS);
      const to = day(now + WINDOW_DAYS * DAY_MS);
      const { matches } = await getJson<{ matches: FootballMatch[] }>(
        `${base}/${league}/matches?dateFrom=${from}&dateTo=${to}`,
        headers,
      );
      await wait(FOOTBALL_GAP_MS);
      const { standings } = await getJson<{ standings: { type: string; table: FootballTableRow[] }[] }>(
        `${base}/${league}/standings`,
        headers,
      );
      await wait(FOOTBALL_GAP_MS);

      const table = standings.find((s) => s.type === "TOTAL")?.table ?? [];
      const saved = await supabase.from("sports_matches").upsert(
        matches.map((m) => footballMatch(league, m)),
        { onConflict: "league,external_id" },
      );
      if (saved.error) throw saved.error;
      const ranked = await supabase.from("sports_standings").upsert(
        table.map((r) => footballStanding(league, r)),
        { onConflict: "league,team" },
      );
      if (ranked.error) throw ranked.error;
      await supabase
        .from("sports_matches")
        .delete()
        .eq("league", league)
        .lt("starts_at", new Date(now - WINDOW_DAYS * DAY_MS).toISOString());
      await mark(supabase, league, true);
    } catch (failure) {
      console.error(`sports-sync ${league}:`, failure instanceof Error ? failure.message : failure);
      await mark(supabase, league, false);
    }
  }
}

async function syncNba(supabase: SupabaseClient, key: string, now: number) {
  try {
    const rows: MatchRow[] = [];
    let cursor: number | undefined;
    for (let page = 0; page < MAX_NBA_PAGES; page++) {
      const query = new URLSearchParams({
        start_date: day(now - NBA_BACK_DAYS * DAY_MS),
        end_date: day(now + WINDOW_DAYS * DAY_MS),
        per_page: "100",
      });
      if (cursor) query.set("cursor", String(cursor));
      const reply = await getJson<{ data: NbaGame[]; meta?: { next_cursor?: number } }>(
        `https://api.balldontlie.io/v1/games?${query}`,
        { Authorization: key },
      );
      rows.push(...reply.data.map(nbaMatch));
      cursor = reply.meta?.next_cursor;
      if (!cursor) break;
      await wait(NBA_GAP_MS);
    }

    const saved = await supabase.from("sports_matches").upsert(rows, { onConflict: "league,external_id" });
    if (saved.error) throw saved.error;
    await supabase
      .from("sports_matches")
      .delete()
      .eq("league", "NBA")
      .lt("starts_at", new Date(now - NBA_KEEP_DAYS * DAY_MS).toISOString());

    const { data: stored, error } = await supabase.from("sports_matches").select("*").eq("league", "NBA");
    if (error) throw error;
    const ranked = await supabase
      .from("sports_standings")
      .upsert(nbaStandings(stored as MatchRow[]), { onConflict: "league,team" });
    if (ranked.error) throw ranked.error;
    await mark(supabase, "NBA", true);
  } catch (failure) {
    console.error("sports-sync NBA:", failure instanceof Error ? failure.message : failure);
    await mark(supabase, "NBA", false);
  }
}

/** Saves one series. Standings rows that this run did not touch are deleted after the save. */
async function saveSeries(
  supabase: SupabaseClient,
  series: Series,
  races: RaceRow[],
  results: ResultRow[],
  standings: MotorStandingRow[],
) {
  const startedAt = new Date().toISOString();
  const now = { updated_at: startedAt };
  const savedRaces = await supabase.from("motor_races").upsert(
    races.map((r) => ({ ...r, ...now })),
    { onConflict: "series,season,round" },
  );
  if (savedRaces.error) throw savedRaces.error;
  if (results.length) {
    const savedResults = await supabase.from("motor_results").upsert(
      results.map((r) => ({ ...r, ...now })),
      { onConflict: "series,season,round,position" },
    );
    if (savedResults.error) throw savedResults.error;
  }
  if (standings.length) {
    const savedStandings = await supabase.from("motor_standings").upsert(
      standings.map((r) => ({ ...r, ...now })),
      { onConflict: "series,kind,name" },
    );
    if (savedStandings.error) throw savedStandings.error;
    await supabase.from("motor_standings").delete().eq("series", series).lt("updated_at", startedAt);
  }
}

async function syncF1(supabase: SupabaseClient) {
  try {
    const base = "https://api.jolpi.ca/ergast/f1/current";
    type Reply<K extends string, V> = { MRData: Record<K, V> };
    const schedule = await getJson<Reply<"RaceTable", { Races: JolpicaRace[] }>>(`${base}.json`);
    const last = await getJson<Reply<"RaceTable", { Races: JolpicaRace[] }>>(`${base}/last/results.json`);
    const drivers = await getJson<
      Reply<"StandingsTable", { StandingsLists: { DriverStandings: JolpicaDriverStanding[] }[] }>
    >(`${base}/driverStandings.json`);
    const teams = await getJson<
      Reply<"StandingsTable", { StandingsLists: { ConstructorStandings: JolpicaTeamStanding[] }[] }>
    >(`${base}/constructorStandings.json`);

    const lastRace = last.MRData.RaceTable.Races[0];
    // Results of last season's final race are not this season's.
    const sameSeason = lastRace && lastRace.season === schedule.MRData.RaceTable.Races[0]?.season;
    const lastRound = sameSeason ? Number(lastRace.round) : 0;
    await saveSeries(
      supabase,
      "F1",
      f1Races(schedule.MRData.RaceTable.Races, lastRound),
      sameSeason ? f1Results(lastRace) : [],
      [
        ...f1DriverStandings(drivers.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? []),
        ...f1TeamStandings(teams.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []),
      ],
    );
    await mark(supabase, "F1", true);
  } catch (failure) {
    console.error("sports-sync F1:", failure instanceof Error ? failure.message : failure);
    await mark(supabase, "F1", false);
  }
}

async function syncMotoGp(supabase: SupabaseClient) {
  try {
    const base = "https://api.motogp.pulselive.com/motogp/v1/results";
    const seasons = await getJson<{ id: string; year: number; current: boolean }[]>(`${base}/seasons`);
    const season = seasons.find((s) => s.current);
    if (!season) throw new Error("no current season");
    const categories = await getJson<{ id: string; name: string }[]>(`${base}/categories?seasonUuid=${season.id}`);
    const category = categories.find((c) => c.name.startsWith("MotoGP"));
    if (!category) throw new Error("no MotoGP category");
    const events = mgpRaceEvents(await getJson<MgpEvent[]>(`${base}/events?seasonUuid=${season.id}`));

    const races: RaceRow[] = [];
    const raceSessions = new Map<number, string>();
    for (const [i, event] of events.entries()) {
      const sessions = await getJson<MgpSession[]>(
        `${base}/sessions?eventUuid=${event.id}&categoryUuid=${category.id}`,
      );
      const row = mgpRace(event, i + 1, season.year, sessions);
      races.push(row);
      const race = sessions.find((s) => s.type === "RAC");
      if (race && row.status === "final") raceSessions.set(row.round, race.id);
    }

    const lastFinal = races.filter((r) => r.status === "final").at(-1);
    let results: ResultRow[] = [];
    if (lastFinal) {
      const { classification } = await getJson<{ classification: MgpClassification[] }>(
        `${base}/session/${raceSessions.get(lastFinal.round)}/classification?test=false`,
      );
      results = mgpResults(classification, season.year, lastFinal.round);
    }
    const { classification: table } = await getJson<{ classification: MgpStanding[] }>(
      `${base}/standings?seasonUuid=${season.id}&categoryUuid=${category.id}`,
    );
    await saveSeries(supabase, "MGP", races, results, [...mgpRiderStandings(table), ...mgpTeamStandings(table)]);
    await mark(supabase, "MGP", true);
  } catch (failure) {
    console.error("sports-sync MGP:", failure instanceof Error ? failure.message : failure);
    await mark(supabase, "MGP", false);
  }
}

async function syncMotor(supabase: SupabaseClient, force: boolean) {
  if (!force) {
    const { data } = await supabase.from("motor_races").select("starts_at").neq("status", "cancelled");
    // With no race stored yet, the first run fills the tables.
    if (
      data?.length &&
      !motorDue(
        Date.now(),
        data.map((r) => r.starts_at),
      )
    )
      return false;
  }
  await Promise.all([syncF1(supabase), syncMotoGp(supabase)]);
  return true;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { only?: string; force?: boolean };
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  if (body.only === "motor") {
    const ran = await syncMotor(supabase, body.force === true);
    return Response.json({ ok: true, ran });
  }

  const football = Deno.env.get("FOOTBALL_DATA_KEY");
  const nba = Deno.env.get("BALLDONTLIE_KEY");
  if (!football || !nba) return new Response("Sports keys are not set", { status: 500 });
  const now = Date.now();
  await Promise.all([syncFootball(supabase, football, now), syncNba(supabase, nba, now)]);
  return Response.json({ ok: true });
});
