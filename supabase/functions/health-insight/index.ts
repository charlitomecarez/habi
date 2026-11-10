// Runs each hour at :45 from pg_cron (migration 20261110000200). For each account with the health
// check on, whose local time is 5:45 to 5:59 PM and with no advice for today, it sends 7 days of
// sleep and steps and the weight trend to Groq, keeps 1 to 3 tips, and writes one reminder for
// 6:00 PM. send-reminders sends the push. With no numbers in 3 days, or when Groq fails, it saves
// nothing and sends no push.
//
// Secrets: CRON_SECRET, GROQ_API_KEY, optional GROQ_MODEL. The prompt holds numbers only: no name,
// no email and no ID. The log holds counts and status codes only, never a number or a tip.

import { createClient } from "@supabase/supabase-js";

import {
  addDays,
  basedOn,
  dueDay,
  healthPrompt,
  parseTips,
  PUSH_TITLE,
  sixPm,
  type HealthDay,
  type Weight,
} from "../_shared/health-insight.ts";

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const WEIGHT_DAYS = 30;

class GroqError extends Error {
  constructor(readonly status: number) {
    super(`Groq ${status}`);
  }
}

async function askGroq(prompt: string): Promise<string> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new GroqError(0);
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: Deno.env.get("GROQ_MODEL") ?? DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  // Read the body, but never log it.
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new GroqError(res.status);
  const text: string | undefined = json?.choices?.[0]?.message?.content;
  if (!text) throw new GroqError(res.status);
  return text;
}

/** One call, and one retry that names the problems. Null when both answers fail the checks. */
async function tipsFor(days: HealthDay[], weights: Weight[], today: string, usesEarlierDay: boolean) {
  const first = parseTips(await askGroq(healthPrompt(days, weights, today)), usesEarlierDay);
  if (first.ok) return first.tips;
  const second = parseTips(await askGroq(healthPrompt(days, weights, today, first.problems)), usesEarlierDay);
  return second.ok ? second.tips : null;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: accounts, error } = await supabase
    .from("user_settings")
    .select("user_id, timezone")
    .eq("health_check", true);
  if (error) return Response.json({ ok: false, step: "accounts" }, { status: 500 });

  const now = new Date();
  const counts = { on: accounts.length, due: 0, saved: 0, noNumbers: 0, rejected: 0, groqFailed: 0, failed: 0 };
  const groqStatuses: number[] = [];

  for (const account of accounts) {
    const timeZone = account.timezone ?? "Asia/Manila";
    const today = dueDay(timeZone, now);
    if (!today) continue;

    const { count } = await supabase
      .from("health_insights")
      .select("id", { count: "exact", head: true })
      .eq("user_id", account.user_id)
      .eq("day", today);
    if (count) continue;
    counts.due += 1;

    try {
      const [days, weights] = await Promise.all([
        supabase
          .from("health_days")
          .select("day, sleep_minutes, bed_time, wake_time, steps")
          .eq("user_id", account.user_id)
          .gte("day", addDays(today, -6))
          .lte("day", today),
        supabase
          .from("weight_logs")
          .select("on_date, weight_kg")
          .eq("user_id", account.user_id)
          .gte("on_date", addDays(today, -WEIGHT_DAYS)),
      ]);
      if (days.error || weights.error) throw new Error("read");

      const base = basedOn(days.data, today);
      if (!base) {
        counts.noNumbers += 1;
        continue;
      }

      const tips = await tipsFor(days.data, weights.data, today, base.usesEarlierDay);
      if (!tips) {
        counts.rejected += 1;
        continue;
      }

      const { data: insight, error: insertError } = await supabase
        .from("health_insights")
        .insert({ user_id: account.user_id, day: today, tips, based_on: base.day })
        .select("id")
        .single();
      if (insertError) throw new Error("insert");

      const { error: reminderError } = await supabase.from("reminders").insert({
        user_id: account.user_id,
        source_type: "health",
        source_id: insight.id,
        title: PUSH_TITLE,
        body: null,
        remind_at: sixPm(today, timeZone),
      });
      if (reminderError) throw new Error("reminder");
      counts.saved += 1;
    } catch (failure) {
      if (failure instanceof GroqError) {
        counts.groqFailed += 1;
        groqStatuses.push(failure.status);
      } else {
        counts.failed += 1;
      }
    }
  }

  console.log("health-insight", JSON.stringify({ ...counts, groqStatuses }));
  return Response.json({ ok: counts.failed === 0 && counts.groqFailed === 0, ...counts, groqStatuses });
});
