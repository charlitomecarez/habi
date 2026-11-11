// Adds a channel for the signed-in account. It turns a link or an @handle into a channel ID and
// title, saves the row as the caller (so owner RLS and the 30-channel limit apply), and fills the
// cache with the channel's feed, so its last 15 videos show at once. Logs status codes only.
//
// Secrets: none. YouTube feeds and channel pages are public.

import { createClient } from "@supabase/supabase-js";

import { channelIdFromPage, ERRORS, feedUrl, parseChannelInput, parseFeed } from "../_shared/youtube.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });
const fail = (error: string, status = 422) => reply({ error }, status);

async function get(url: string): Promise<string | null> {
  const res = await fetch(url, {
    // English pages, and no cookie consent wall.
    headers: { "Accept-Language": "en", Cookie: "CONSENT=YES+1" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.warn("youtube-channel fetch", res.status);
    return null;
  }
  return await res.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Use POST.", 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: auth } = await asUser.auth.getUser(authorization.replace("Bearer ", ""));
  if (!auth.user) return fail("Sign in first.", 401);

  const body = (await req.json().catch(() => ({}))) as { input?: string };
  const input = parseChannelInput(String(body.input ?? ""));
  if (input.kind === "error") return fail(input.error);

  let channelId = input.kind === "id" ? input.id : null;
  if (input.kind === "page") {
    const page = await get(input.url);
    channelId = page ? channelIdFromPage(page) : null;
  }
  if (!channelId) return fail(ERRORS.notFound);

  const xml = await get(feedUrl(channelId));
  if (!xml) return fail(ERRORS.notFound);
  const feed = parseFeed(xml, channelId);
  if (!feed.title) return fail(ERRORS.notFound);

  const saved = await asUser
    .from("youtube_channels")
    .insert({ channel_id: channelId, title: feed.title.slice(0, 200) });
  if (saved.error) {
    if (saved.error.code === "23505") return fail(ERRORS.duplicate);
    if (saved.error.message.includes("channel_limit")) return fail(ERRORS.limit);
    console.error("youtube-channel insert", saved.error.code);
    return fail("Could not add the channel. Try again.", 500);
  }

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const now = new Date().toISOString();
  if (feed.videos.length) {
    await service.from("youtube_videos").upsert(
      feed.videos.map((v) => ({ ...v, updated_at: now })),
      { onConflict: "video_id" },
    );
  }
  await service.from("youtube_feeds").upsert({ channel_id: channelId, last_ok_at: now });
  return reply({ channel_id: channelId, title: feed.title, videos: feed.videos.length });
});
