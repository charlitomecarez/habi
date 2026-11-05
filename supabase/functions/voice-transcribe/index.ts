// Turns one voice message into text for the signed-in sender. The app uploads the audio first,
// then calls this with { path, durationS }, or with { messageId } to retry a failed message.
// This function is the only writer of voice_messages, so the app cannot set a transcript or a recipient.
//
// Secrets (supabase secrets set ...): GROQ_API_KEY, optional GROQ_SPEECH_MODEL.
// Log only the status and the length. Never log the audio or the text.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_MODEL = "whisper-large-v3";
const BUCKET = "voice-audio";
const MAX_SECONDS = 300;
const DAILY_LIMIT = 50;
/** A pending row this old lost its run, so the sender may retry it. */
const STUCK_MS = 5 * 60 * 1000;
/** Tells Whisper to expect mixed Tagalog and English, and to keep it as spoken. */
const STYLE_PROMPT = "Taglish na usapan. Kumain ka na ba? Pauwi na ako, tawag ka later pag free ka na.";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });
const fail = (error: string, status = 422) => reply({ error }, status);

type Message = { id: string; audio_path: string | null; duration_s: number; status: string; created_at: string };
const MESSAGE_COLUMNS = "id, audio_path, duration_s, status, created_at";

async function transcribe(audio: Blob, path: string): Promise<string> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const form = new FormData();
  form.append("file", audio, path.split("/").pop() ?? "voice.m4a");
  form.append("model", Deno.env.get("GROQ_SPEECH_MODEL") ?? DEFAULT_MODEL);
  form.append("prompt", STYLE_PROMPT);
  form.append("temperature", "0");
  form.append("response_format", "json");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  // The response body is left out of the error, so no text can reach the logs.
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const text = ((await res.json())?.text ?? "").trim();
  if (!text) throw new Error("Groq returned no text");
  return text;
}

/** Runs the transcription and stores the result. A failure keeps the audio, so Retry works. */
async function finish(admin: SupabaseClient, message: Message) {
  try {
    const { data: audio, error } = await admin.storage.from(BUCKET).download(message.audio_path!);
    if (error) throw new Error("Could not read the audio");
    const transcript = await transcribe(audio, message.audio_path!);
    const { error: saveError } = await admin
      .from("voice_messages")
      .update({ transcript, status: "ready" })
      .eq("id", message.id);
    if (saveError) throw new Error("Could not save the text");
    console.log(`voice-transcribe: ready, ${message.duration_s}s`);
    return reply({ id: message.id, status: "ready" });
  } catch (error) {
    console.error(`voice-transcribe: failed, ${message.duration_s}s, ${(error as Error).message}`);
    await admin.from("voice_messages").update({ status: "failed" }).eq("id", message.id);
    return reply({ id: message.id, status: "failed" });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Use POST.", 405);

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth.user) return fail("Sign in first.", 401);
  const userId = auth.user.id;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: pair } = await admin.from("voice_pairs").select("partner_id").eq("user_id", userId).maybeSingle();
  if (!pair) return fail("Pair with your partner first.", 403);

  const body = await req.json().catch(() => null);

  if (typeof body?.messageId === "string") {
    const { data: message } = await admin
      .from("voice_messages")
      .select(MESSAGE_COLUMNS)
      .eq("id", body.messageId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!message) return fail("This message is gone.", 404);
    const stuck = message.status === "pending" && Date.now() - Date.parse(message.created_at) > STUCK_MS;
    if (message.status !== "failed" && !stuck) return reply({ id: message.id, status: message.status });
    if (!message.audio_path) return fail("The audio for this message was deleted.");
    await admin.from("voice_messages").update({ status: "pending" }).eq("id", message.id);
    return finish(admin, message);
  }

  const path: unknown = body?.path;
  const durationS: unknown = body?.durationS;
  if (typeof path !== "string" || !new RegExp(`^${userId}/[0-9a-z-]{8,40}\\.(m4a|webm)$`).test(path)) {
    return fail("This recording has a bad path.", 400);
  }
  if (typeof durationS !== "number" || !Number.isInteger(durationS) || durationS < 1 || durationS > MAX_SECONDS) {
    return fail("A message can be up to 5 minutes.", 400);
  }

  // A repeat call for the same audio returns the first result, so a lost reply cannot send twice.
  const { data: existing } = await admin
    .from("voice_messages")
    .select(MESSAGE_COLUMNS)
    .eq("audio_path", path)
    .maybeSingle();
  if (existing) return reply({ id: existing.id, status: existing.status });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("voice_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) return fail("You reached 50 messages today. Try again tomorrow.", 429);

  const { data: message, error } = await admin
    .from("voice_messages")
    .insert({ user_id: userId, recipient_id: pair.partner_id, audio_path: path, duration_s: durationS })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) return fail("Could not save this message.", 500);

  return finish(admin, message);
});
