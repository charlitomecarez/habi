// Runs at 6 AM PHT from pg_cron (see migration 20261111000300). It reads the films in Philippine
// cinemas from TMDB and stores 20 for Now showing and 20 for Coming soon, so the app never calls TMDB
// and the key stays here. Each list is replaced in one transaction, so a failed run keeps the old list.
// Logs counts and status codes only.
//
// Secrets (dashboard): CRON_SECRET, TMDB_KEY (a v3 key or a v4 read token).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  LIST_SIZE,
  movieRow,
  soonOrder,
  tmdbAuth,
  TMDB_REGION,
  type MovieList,
  type TmdbDetails,
  type TmdbListItem,
} from "../_shared/movies.ts";

const BASE = "https://api.themoviedb.org/3";

async function tmdb<T>(key: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const auth = tmdbAuth(key);
  const query = new URLSearchParams({ ...params, ...auth.query });
  const res = await fetch(`${BASE}${path}?${query}`, {
    headers: { Accept: "application/json", ...auth.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`TMDB ${path.split("/")[1]} ${res.status}`);
  return (await res.json()) as T;
}

async function listItems(key: string, list: MovieList, today: string): Promise<TmdbListItem[]> {
  const items: TmdbListItem[] = [];
  // Coming soon drops films that already opened, so it can need a second page.
  for (let page = 1; page <= 3 && items.length < LIST_SIZE; page++) {
    const reply = await tmdb<{ results: TmdbListItem[]; total_pages: number }>(
      key,
      `/movie/${list === "now" ? "now_playing" : "upcoming"}`,
      { region: TMDB_REGION, language: "en-US", page: String(page) },
    );
    const fresh = reply.results.filter((m) => !items.some((i) => i.id === m.id));
    items.push(...(list === "soon" ? soonOrder(fresh, today) : fresh));
    if (page >= reply.total_pages) break;
  }
  return list === "soon" ? soonOrder(items, today).slice(0, LIST_SIZE) : items.slice(0, LIST_SIZE);
}

async function syncList(supabase: SupabaseClient, key: string, list: MovieList, today: string): Promise<number> {
  const items = await listItems(key, list, today);
  const rows = [];
  for (const [i, item] of items.entries()) {
    const details = await tmdb<TmdbDetails>(key, `/movie/${item.id}`, {
      language: "en-US",
      append_to_response: "videos,release_dates",
    });
    rows.push(movieRow(details, i + 1));
  }
  // Now showing: newest opening first. Coming soon keeps the soonest first.
  if (list === "now") {
    rows.sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""));
    rows.forEach((r, i) => (r.position = i + 1));
  }
  const { error } = await supabase.rpc("replace_movies", { p_list: list, p_rows: rows });
  if (error) throw error;
  return rows.length;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const key = Deno.env.get("TMDB_KEY");
  if (!key) return new Response("TMDB_KEY is not set", { status: 500 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  // Today in the Philippines, for Coming soon.
  const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const now = new Date().toISOString();
  try {
    const counts = {
      now: await syncList(supabase, key, "now", today),
      soon: await syncList(supabase, key, "soon", today),
    };
    await supabase.from("movies_sync").upsert({ id: true, last_ok_at: now });
    console.log("movies-sync", counts);
    return Response.json({ ok: true, ...counts });
  } catch (failure) {
    console.error("movies-sync:", failure instanceof Error ? failure.message : "failed");
    await supabase.from("movies_sync").upsert({ id: true, last_error_at: now });
    return Response.json({ ok: false }, { status: 502 });
  }
});
