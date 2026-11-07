// Runs at 6 AM PHT from pg_cron, and from Refresh and Draft cover letter in the app. Only accounts
// in app_admins get a result. The app never calls freehire or Groq.
//
// Body: {} for a search, or { "action": "letter", "external_id": "..." } for a letter.
// Secrets: CRON_SECRET, GROQ_API_KEY, optional GROQ_MODEL. Log only counts.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  countryCode,
  dedupe,
  letterPrompt,
  parseScores,
  scorePrompt,
  toJob,
  type FreehireJob,
  type Job,
  type JobProfile,
} from "../_shared/jobs.ts";

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const SEARCH_URL = "https://freehire.me/api/v1/jobs/search";
const MAX_SEARCHES = 4;
const PER_SEARCH = 25;
const MAX_SCORED = 40;
const SCORE_BATCH = 20;
const KEEP_NEW = 20;
const CLEAN_DAYS = 30;
const POSTED_WITHIN_DAYS = "14";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

async function search(params: Record<string, string>, flags: { remote?: boolean; visa?: boolean }): Promise<Job[]> {
  const query = new URLSearchParams({ limit: String(PER_SEARCH), posted_within_days: POSTED_WITHIN_DAYS, ...params });
  const res = await fetch(`${SEARCH_URL}?${query}`, {
    headers: { "User-Agent": "javaplum/my-app/1.3 (private app; personal job search)" },
  });
  if (!res.ok) throw new Error(`freehire ${res.status}`);
  const json = (await res.json()) as { data: FreehireJob[]; meta?: { ignored_params?: unknown[] } };
  // An unknown filter is ignored, and it would return the whole catalogue.
  if (json.meta?.ignored_params?.length) throw new Error("freehire ignored a filter");
  return json.data.flatMap((row) => toJob(row, flags) ?? []);
}

async function findJobs(profile: JobProfile): Promise<Job[]> {
  const codes = profile.countries.flatMap((c) => countryCode(c) ?? []);
  const home = codes.includes("ph") || codes.length === 0 ? ["ph"] : [];
  const abroad = codes.filter((c) => c !== "ph");
  const jobs: Job[] = [];
  for (const q of profile.wanted_jobs.slice(0, MAX_SEARCHES)) {
    if (home.length) jobs.push(...(await search({ q, countries: "ph" }, {})));
    for (const code of abroad)
      jobs.push(...(await search({ q, countries: code, visa_sponsorship: "true" }, { visa: true })));
    if (profile.remote_ok) jobs.push(...(await search({ q, work_mode: "remote" }, { remote: true })));
  }
  return dedupe(jobs);
}

async function askGroq(prompt: string, json: boolean): Promise<string> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: Deno.env.get("GROQ_MODEL") ?? DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const body = await res.json();
  const text: string | undefined = body?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text");
  return text;
}

async function runFor(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data: profile, error } = await supabase.from("job_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!profile) return 0;
  const now = new Date().toISOString();
  await supabase.from("job_profiles").update({ last_run_at: now }).eq("user_id", userId);

  const { data: known, error: knownError } = await supabase
    .from("job_matches")
    .select("external_id")
    .eq("user_id", userId);
  if (knownError) throw knownError;
  const seen = new Set(known.map((k) => k.external_id));

  const fresh = (await findJobs(profile as JobProfile)).filter((j) => !seen.has(j.external_id)).slice(0, MAX_SCORED);

  const scored: (Job & { score: number; reason: string })[] = [];
  for (let start = 0; start < fresh.length; start += SCORE_BATCH) {
    const batch = fresh.slice(start, start + SCORE_BATCH);
    const text = await askGroq(scorePrompt(profile as JobProfile, batch), true);
    for (const s of parseScores(text, batch.length)) scored.push({ ...batch[s.i], score: s.score, reason: s.reason });
  }
  const best = scored.sort((a, b) => b.score - a.score).slice(0, KEEP_NEW);

  if (best.length > 0) {
    const { error: saveError } = await supabase.from("job_matches").upsert(
      best.map((j) => ({ ...j, user_id: userId })),
      { onConflict: "user_id,external_id", ignoreDuplicates: true },
    );
    if (saveError) throw saveError;
  }

  const oldest = new Date(Date.now() - CLEAN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("job_matches")
    .delete()
    .eq("user_id", userId)
    .in("status", ["new", "hidden"])
    .lt("created_at", oldest);
  await supabase
    .from("job_profiles")
    .update({ last_ok_at: new Date().toISOString(), last_new_count: best.length })
    .eq("user_id", userId);
  return best.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: admins, error: adminError } = await supabase.from("app_admins").select("user_id");
  if (adminError) return reply({ error: "Could not check your account." }, 500);
  const adminIds = admins.map((a) => a.user_id as string);

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) {
    let added = 0;
    for (const id of adminIds) {
      try {
        added += await runFor(supabase, id);
      } catch (failure) {
        // A failed run keeps the last good list.
        console.error("job-search:", failure instanceof Error ? failure.message : "failed");
      }
    }
    return reply({ ok: true, added });
  }

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth.user) return reply({ error: "Sign in first." }, 401);
  if (!adminIds.includes(auth.user.id)) return reply({ error: "Find a work is for the admin." }, 403);

  const body = (await req.json().catch(() => ({}))) as { action?: string; external_id?: string };
  try {
    if (body.action === "letter") {
      const [profile, job] = await Promise.all([
        supabase.from("job_profiles").select("*").eq("user_id", auth.user.id).single(),
        supabase
          .from("job_matches")
          .select("title, company, summary")
          .eq("user_id", auth.user.id)
          .eq("external_id", body.external_id ?? "")
          .single(),
      ]);
      if (profile.error || job.error) return reply({ error: "Could not find this job." }, 404);
      const letter = (
        await askGroq(letterPrompt(profile.data as JobProfile, { ...job.data, summary: job.data.summary ?? "" }), false)
      ).slice(0, 6000);
      return reply({ letter });
    }
    return reply({ added: await runFor(supabase, auth.user.id) });
  } catch (failure) {
    console.error("job-search:", failure instanceof Error ? failure.message : "failed");
    return reply({ error: "Could not search today. Try again later." }, 502);
  }
});
