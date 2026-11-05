// Reads one bank statement PDF for the signed-in user and returns its rows.
// The PDF stays in memory and nothing is stored. The app saves rows after review.
//
// Secrets (supabase secrets set ...): GOTYME_KEY, GCASH_KEY. MariBank PDFs have no password.
// Log only the bank and the row count. Never log the file text, the rows or the keys.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getDocument } from "npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs";
import * as pdfWorker from "npm:pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs";

import { addReferences, parseStatement, toLines, totalsMatch, type Line, type TextItem } from "../_shared/statements.ts";

// Runs the pdf.js worker in this thread. The Edge runtime has no worker file to load.
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfWorker;

const MAX_BYTES = 5 * 1024 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });
const fail = (error: string, status = 422) => reply({ error }, status);

async function openPdf(data: Uint8Array) {
  // No password first, then each key. The first one that opens the file wins.
  for (const password of [undefined, Deno.env.get("GOTYME_KEY"), Deno.env.get("GCASH_KEY")]) {
    try {
      return await getDocument({ data: data.slice(), password, verbosity: 0, isEvalSupported: false }).promise;
    } catch (error) {
      if ((error as Error).name !== "PasswordException") throw error;
    }
  }
  return null;
}

async function readLines(data: Uint8Array): Promise<Line[] | null> {
  const doc = await openPdf(data);
  if (!doc) return null;
  const lines: Line[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const item of content.items) {
      if ("str" in item) items.push({ text: item.str, x: item.transform[4], y: item.transform[5] });
    }
    lines.push(...toLines(items));
  }
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Use POST.", 405);

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth.user) return fail("Sign in first.", 401);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Choose a PDF statement.", 400);
  if (file.size > MAX_BYTES) return fail("This file is larger than 5 MB.", 413);

  try {
    const lines = await readLines(new Uint8Array(await file.arrayBuffer()));
    if (!lines) return fail("No saved key opens this PDF.");

    const parsed = parseStatement(lines);
    if (!parsed) return fail("This is not a GoTyme, GCash or MariBank statement.");
    if (!totalsMatch(parsed)) return fail("The rows do not match the statement totals, so nothing was read. The bank may have changed its layout.");

    const statement = await addReferences(parsed);
    console.log(`import-statement: ${statement.bank}, ${statement.rows.length} rows`);
    return reply(statement);
  } catch (error) {
    console.error(`import-statement: ${(error as Error).name}`);
    return fail("This file could not be read as a statement.");
  }
});
