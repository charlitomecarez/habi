// Tells the app which keyed parts this server can run, so a copy of my-app without a key hides that
// module. It answers yes or no only, and never returns a key. Called by a signed-in app.
//
// Secrets read (presence only): FOOTBALL_DATA_KEY, BALLDONTLIE_KEY, GROQ_API_KEY, GEMINI_API_KEY,
// RESEND_API_KEY.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const has = (name: string) => (Deno.env.get(name) ?? "").trim().length > 0;

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  return Response.json(
    {
      sports: has("FOOTBALL_DATA_KEY") && has("BALLDONTLIE_KEY"),
      ai: has("GROQ_API_KEY"),
      tip: has("GEMINI_API_KEY"),
      email: has("RESEND_API_KEY"),
    },
    { headers: { ...CORS, "Cache-Control": "private, max-age=3600" } },
  );
});
