// Reads a resume PDF in memory and returns a draft work profile. It stores nothing, and it logs only
// the status. Emails, phone numbers and links are removed before Groq reads the text. A name or a
// street address cannot be removed by rule, so you check the draft before you save it.
//
// Secrets: GROQ_API_KEY, optional GROQ_MODEL.

import { createClient } from "@supabase/supabase-js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

import { draftPrompt, parseDraft, scrubContacts } from "../_shared/jobs.ts";

// Runs the pdf.js worker in this thread. The Edge runtime has no worker file to load.
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfWorker;

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_TEXT = 40;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

async function readText(data: Uint8Array): Promise<string> {
  const doc = await getDocument({ data, verbosity: 0, isEvalSupported: false }).promise;
  const parts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    for (const item of content.items) if ("str" in item) parts.push(item.str);
  }
  return parts.join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth.user) return reply({ error: "Sign in first." }, 401);
  const { data: admin } = await supabase.from("app_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (!admin) return reply({ error: "Find a work is for the admin." }, 403);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return reply({ error: "Choose a PDF." }, 400);
  if (file.size > MAX_BYTES) return reply({ error: "This file is larger than 5 MB." }, 413);

  let text: string;
  try {
    text = await readText(new Uint8Array(await file.arrayBuffer()));
  } catch (failure) {
    if ((failure as Error).name === "PasswordException") {
      return reply({ error: "This PDF has a password. Remove it, or choose another file." }, 422);
    }
    console.error(`job-profile-draft: ${(failure as Error).name}`);
    return reply(
      { error: "The server could not finish reading this PDF. Type your profile, or try a shorter file." },
      422,
    );
  }
  if (text.trim().length < MIN_TEXT) {
    return reply({ error: "This PDF has no text. It may be a scan. Type your profile, or choose another file." }, 422);
  }

  try {
    const key = Deno.env.get("GROQ_API_KEY");
    if (!key) throw new Error("no key");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: Deno.env.get("GROQ_MODEL") ?? DEFAULT_MODEL,
        messages: [{ role: "user", content: draftPrompt(scrubContacts(text)) }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const body = await res.json();
    console.log("job-profile-draft: ok");
    return reply(parseDraft(body?.choices?.[0]?.message?.content ?? "{}"));
  } catch (failure) {
    console.error(`job-profile-draft: ${(failure as Error).message}`);
    return reply({ error: "Could not draft your profile. Type it, or try again later." }, 502);
  }
});
