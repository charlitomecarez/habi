// Runs once a day at 12:00 AM PHT from pg_cron (see migration 20261104001700).
// Asks the Gemini API free tier for one short tip on a random topic and stores it
// in daily_tips for each user, so every device shows the same tip that day.
//
// Secrets (supabase secrets set ...): CRON_SECRET, GEMINI_API_KEY, optional GEMINI_MODEL.
// The prompt has no personal data: Google may use free-tier content to improve its products.

import { createClient } from "@supabase/supabase-js";

const TOPICS = ["life", "work", "relationships", "money", "health", "focus"] as const;
const DEFAULT_MODEL = "gemini-2.5-flash";

function localDay(timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

async function askGemini(topic: string): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const model = Deno.env.get("GEMINI_MODEL") ?? DEFAULT_MODEL;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                `Write one practical tip about ${topic} for an adult's day. ` +
                "One or two short sentences, under 200 characters, plain words, no quotes, no hashtags, no emoji, " +
                "and something a person can do today.",
            },
          ],
        },
      ],
      generationConfig: { temperature: 1, maxOutputTokens: 120 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  const tip = text?.trim().replace(/^["“]|["”]$/g, "");
  if (!tip) throw new Error("Gemini returned no text");
  return tip.slice(0, 600);
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  let tip: string;
  try {
    tip = await askGemini(topic);
  } catch (error) {
    // The app falls back to a bundled tip when today's row is missing.
    console.error("daily-tip:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { status: 502 });
  }

  const { data: users, error } = await supabase.from("user_settings").select("user_id, timezone");
  if (error) throw error;
  const rows = users.map((u) => ({ user_id: u.user_id, on_date: localDay(u.timezone ?? "Asia/Manila"), topic, tip }));
  const { error: insertError } = await supabase
    .from("daily_tips")
    .upsert(rows, { onConflict: "user_id,on_date", ignoreDuplicates: true });
  if (insertError) throw insertError;
  return Response.json({ ok: true, topic, users: rows.length });
});
