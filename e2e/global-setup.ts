import { mkdirSync, writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { e2eEnv } from "./env";

// Signs in with the password account in code, then hands the session to the browser the way the app
// stores it. The login screen stays Google and email code only, and sign-up stays off.
export default async function globalSetup() {
  const { url, anonKey, email, password } = e2eEnv();
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("The E2E account did not sign in.");

  const ref = new URL(url).hostname.split(".")[0];
  const state = {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:8090",
        localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(data.session) }],
      },
    ],
  };
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync("e2e/.auth/session.json", JSON.stringify(state));
}
