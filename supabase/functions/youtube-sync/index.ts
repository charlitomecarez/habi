// Runs at 5:30 AM PHT from pg_cron (see migration 20261111000400). It reads the public feed of each
// channel that some account follows, 1 second apart, and stores the videos. A failed feed keeps its
// last videos and says so in youtube_feeds. It removes videos older than 60 days and the cache of
// channels that nobody follows. Logs counts only.
//
// Secrets (dashboard): CRON_SECRET.

import { createClient } from "@supabase/supabase-js";

import { feedUrl, KEEP_DAYS, parseFeed } from "../_shared/youtube.ts";

const GAP_MS = 1000;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: follows, error } = await supabase.from("youtube_channels").select("channel_id");
  if (error) return Response.json({ ok: false }, { status: 500 });
  const channels = [...new Set(follows.map((f) => f.channel_id))];

  let ok = 0;
  let failed = 0;
  for (const channelId of channels) {
    const now = new Date().toISOString();
    try {
      const res = await fetch(feedUrl(channelId), { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(String(res.status));
      const feed = parseFeed(await res.text(), channelId);
      if (feed.videos.length) {
        const saved = await supabase.from("youtube_videos").upsert(
          feed.videos.map((v) => ({ ...v, updated_at: now })),
          { onConflict: "video_id" },
        );
        if (saved.error) throw saved.error;
      }
      await supabase.from("youtube_feeds").upsert({ channel_id: channelId, last_ok_at: now });
      ok++;
    } catch {
      await supabase.from("youtube_feeds").upsert({ channel_id: channelId, last_error_at: now });
      failed++;
    }
    await wait(GAP_MS);
  }

  const oldest = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("youtube_videos").delete().lt("published_at", oldest);
  if (channels.length) {
    const list = `(${channels.map((c) => `"${c}"`).join(",")})`;
    await supabase.from("youtube_videos").delete().not("channel_id", "in", list);
    await supabase.from("youtube_feeds").delete().not("channel_id", "in", list);
  } else {
    await supabase.from("youtube_videos").delete().neq("video_id", "");
    await supabase.from("youtube_feeds").delete().neq("channel_id", "");
  }
  console.log("youtube-sync", { channels: channels.length, ok, failed });
  return Response.json({ ok: true, channels: channels.length, failed });
});
