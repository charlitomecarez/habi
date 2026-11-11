// Places near you, for Travel. The phone sends only an area of about 5 km and a kind of place, never
// its exact spot. A list stays fresh for 24 hours in places_cache, shared by area, so the Geoapify use
// stays low. Rows older than 7 days are deleted. Logs counts and status codes only.
//
// Secrets (dashboard): GEOAPIFY_KEY.

import { createClient } from "@supabase/supabase-js";

import {
  CATEGORIES,
  CELL,
  cellCenter,
  FRESH_HOURS,
  GEOAPIFY_CATEGORIES,
  KEEP_DAYS,
  MAX_PLACES,
  parseGeoapify,
  RADIUS_M,
  type GeoapifyFeature,
  type PlaceCategory,
} from "../_shared/places.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });
const HOUR_MS = 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: auth } = await anon.auth.getUser(token);
  if (!auth.user) return reply({ error: "Sign in first." }, 401);

  const key = Deno.env.get("GEOAPIFY_KEY");
  if (!key) return reply({ error: "Places are not set up on this server." }, 500);

  const body = (await req.json().catch(() => ({}))) as { cell?: string; category?: string };
  const cell = String(body.cell ?? "");
  const category = String(body.category ?? "") as PlaceCategory;
  if (!CELL.test(cell) || !CATEGORIES.includes(category))
    return reply({ error: "Send an area and a kind of place." }, 400);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const cached = await service
    .from("places_cache")
    .select("places, fetched_at")
    .eq("cell", cell)
    .eq("category", category)
    .maybeSingle();
  if (cached.data && Date.now() - Date.parse(cached.data.fetched_at) < FRESH_HOURS * HOUR_MS) {
    return reply({ places: cached.data.places, cached: true });
  }

  const { latitude, longitude } = cellCenter(cell);
  const query = new URLSearchParams({
    categories: GEOAPIFY_CATEGORIES[category],
    filter: `circle:${longitude},${latitude},${RADIUS_M}`,
    bias: `proximity:${longitude},${latitude}`,
    limit: String(MAX_PLACES * 2),
    lang: "en",
    apiKey: key,
  });
  const res = await fetch(`https://api.geoapify.com/v2/places?${query}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    console.error("places-nearby geoapify", res.status);
    // An old list is better than none.
    if (cached.data) return reply({ places: cached.data.places, cached: true });
    return reply({ error: "Could not load places." }, 502);
  }
  const { features } = (await res.json()) as { features: GeoapifyFeature[] };
  const places = parseGeoapify(features ?? [], category);
  await service.from("places_cache").upsert({ cell, category, places, fetched_at: new Date().toISOString() });
  await service
    .from("places_cache")
    .delete()
    .lt("fetched_at", new Date(Date.now() - KEEP_DAYS * 24 * HOUR_MS).toISOString());
  console.log("places-nearby", { category, count: places.length });
  return reply({ places, cached: false });
});
