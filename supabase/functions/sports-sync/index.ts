// Runs at 7 AM and 3 PM PHT from pg_cron (see migration 20261106000400). It stores matches and
// standings, so the app never calls a sports API and the keys stay here. A failed league keeps its
// last good rows.
//
// Secrets (dashboard): CRON_SECRET, FOOTBALL_DATA_KEY, BALLDONTLIE_KEY.
// Limits: football-data.org 10 calls a minute, balldontlie 5 calls a minute. The two run side by side.

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

async function getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${new URL(url).hostname} ${res.status}`);
  return (await res.json()) as T;
}

async function mark(supabase: SupabaseClient, league: League, ok: boolean) {
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

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const football = Deno.env.get("FOOTBALL_DATA_KEY");
  const nba = Deno.env.get("BALLDONTLIE_KEY");
  if (!football || !nba) return new Response("Sports keys are not set", { status: 500 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const now = Date.now();
  await Promise.all([syncFootball(supabase, football, now), syncNba(supabase, nba, now)]);
  return Response.json({ ok: true });
});
