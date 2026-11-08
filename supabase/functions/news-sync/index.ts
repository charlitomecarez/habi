// Runs every 2 hours at minute 20 from pg_cron (see migration 20261108000200). It reads public RSS
// feeds and stores headlines, so the app never calls a news site. No key, no Groq. A feed that is
// down keeps its last stories and does not stop the others. Logs counts only.
//
// Secrets (dashboard): CRON_SECRET.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { FEEDS, KEEP_DAYS, parseFeed, type Feed } from "../_shared/news.ts";

const TIMEOUT_MS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;

async function readFeed(feed: Feed): Promise<string> {
  const res = await fetch(feed.url, {
    headers: {
      "User-Agent": "my-app news-sync (private app; headlines only)",
      Accept: "application/rss+xml, text/xml",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${feed.source} ${res.status}`);
  return await res.text();
}

async function syncFeed(supabase: SupabaseClient, feed: Feed, now: number): Promise<number> {
  const mark = (ok: boolean) =>
    supabase.from("news_sync").upsert(
      {
        source: feed.source,
        section: feed.section,
        ...(ok ? { last_ok_at: new Date().toISOString() } : { last_error_at: new Date().toISOString() }),
      },
      { onConflict: "source" },
    );
  try {
    const oldest = new Date(now - KEEP_DAYS * DAY_MS).toISOString();
    // A story older than the keep window would only be deleted again at the end of the run.
    const items = parseFeed(await readFeed(feed), feed, now).filter((i) => i.published_at >= oldest);
    if (items.length > 0) {
      // A story already stored keeps its first fetch time; the title and image can change.
      const { error } = await supabase.from("news_items").upsert(items, { onConflict: "url" });
      if (error) throw error;
    }
    await mark(true);
    return items.length;
  } catch (failure) {
    console.error("news-sync:", feed.source, failure instanceof Error ? failure.message : "failed");
    await mark(false);
    return 0;
  }
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const now = Date.now();
  const counts = await Promise.all(FEEDS.map((feed) => syncFeed(supabase, feed, now)));

  const oldest = new Date(now - KEEP_DAYS * DAY_MS).toISOString();
  await supabase.from("news_items").delete().lt("published_at", oldest);

  const saved = counts.reduce((sum, n) => sum + n, 0);
  console.log("news-sync:", saved, "stories from", counts.filter((n) => n > 0).length, "feeds");
  return Response.json({ ok: true, saved });
});
