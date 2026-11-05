// Runs once a day from pg_cron. Deletes voice audio older than 7 days and keeps the text.
// It goes through the Storage API, because SQL cannot delete a stored file.
//
// Secrets (supabase secrets set ...): CRON_SECRET.

import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "voice-audio";
const KEEP_DAYS = 7;
const BATCH = 500;

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const before = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: old, error } = await supabase
    .from("voice_messages")
    .select("id, audio_path")
    .not("audio_path", "is", null)
    .lt("created_at", before)
    .limit(BATCH);
  if (error) throw error;
  if (old.length === 0) return Response.json({ deleted: 0 });

  const { error: removeError } = await supabase.storage.from(BUCKET).remove(old.map((m) => m.audio_path!));
  if (removeError) throw removeError;

  const { error: updateError } = await supabase
    .from("voice_messages")
    .update({ audio_path: null })
    .in(
      "id",
      old.map((m) => m.id),
    );
  if (updateError) throw updateError;

  console.log(`voice-cleanup: ${old.length} files`);
  return Response.json({ deleted: old.length });
});
