// Runs once a day at 12:05 AM PHT from pg_cron (see migration 20261105000400).
// Asks Groq for today's 3 ulam for each user, checks them, and stores one row, so a refresh or
// "Show another" makes no new call. The app never calls Groq. When this fails, the app shows a
// bundled ulam. Only the admin and ticked accounts get a Groq ulam, so open sign-ups cannot use up
// the free plan. Every other account sees the bundled ulam.
//
// Secrets (supabase secrets set ...): CRON_SECRET, GROQ_API_KEY, optional GROQ_MODEL.
// The prompt has no name, no email and no money data.

import { createClient } from "@supabase/supabase-js";

import { MAX_LIMIT, parseUlamReply, ulamPrompt, type Ulam, type UlamContext } from "../_shared/ulam.ts";

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const KEEP_DAYS = 7;

function localDay(timeZone: string, daysAgo = 0): string {
  // en-CA formats as YYYY-MM-DD.
  const when = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(when);
}

async function askGroq(prompt: string): Promise<string> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: Deno.env.get("GROQ_MODEL") ?? DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.9,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const text: string | undefined = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text");
  return text;
}

/** One call, and one retry that names the problems. */
async function todaysUlam(context: UlamContext): Promise<Ulam[]> {
  const first = parseUlamReply(await askGroq(ulamPrompt(context)), context);
  if (first.ok) return first.ulam;
  const second = parseUlamReply(await askGroq(ulamPrompt(context, first.problems)), context);
  if (second.ok) return second.ulam;
  throw new Error(`Rejected twice: ${second.problems.join(" ")}`);
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: users, error } = await supabase
    .from("user_settings")
    .select("user_id, timezone, ulam_limit, ulam_avoid");
  if (error) throw error;

  const [admins, ticked] = await Promise.all([
    supabase.from("app_admins").select("user_id"),
    supabase.from("voice_access").select("user_id"),
  ]);
  if (admins.error) throw admins.error;
  if (ticked.error) throw ticked.error;
  const allowed = new Set([...admins.data, ...ticked.data].map((row) => row.user_id as string));

  let stored = 0;
  let asked = 0;
  for (const user of users) {
    const timeZone = user.timezone ?? "Asia/Manila";
    const today = localDay(timeZone);

    // The screen shows 7 days, so anything older goes.
    await supabase
      .from("ulam_days")
      .delete()
      .eq("user_id", user.user_id)
      .lt("on_date", localDay(timeZone, KEEP_DAYS - 1));

    if (!allowed.has(user.user_id)) continue;
    asked += 1;

    const { data: past } = await supabase
      .from("ulam_days")
      .select("options, picked, custom")
      .eq("user_id", user.user_id);
    const recent = (past ?? []).flatMap((d) => {
      const name = d.custom?.name ?? d.options?.[d.picked]?.name;
      return name ? [name as string] : [];
    });

    try {
      const options = await todaysUlam({
        limit: Math.min(user.ulam_limit ?? MAX_LIMIT, MAX_LIMIT),
        recent,
        avoid: user.ulam_avoid ?? [],
      });
      const { error: insertError } = await supabase
        .from("ulam_days")
        .upsert(
          { user_id: user.user_id, on_date: today, options, source: "groq" },
          { onConflict: "user_id,on_date", ignoreDuplicates: true },
        );
      if (insertError) throw insertError;
      stored += 1;
    } catch (failure) {
      // The app falls back to a bundled ulam when today's row is missing.
      console.error("daily-ulam:", failure instanceof Error ? failure.message : failure);
    }
  }
  return Response.json({ ok: stored === asked, users: users.length, asked, stored });
});
