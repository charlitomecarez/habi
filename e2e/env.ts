import { createClient } from "@supabase/supabase-js";

/** The E2E account and the project. CI reads them from GitHub Actions secrets. */
export function e2eEnv() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!url || !anonKey || !email || !password) {
    throw new Error("Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, E2E_EMAIL and E2E_PASSWORD.");
  }
  return { url, anonKey, email, password };
}

/** A client signed in as the E2E account, to remove the rows a test added. */
export async function e2eClient() {
  const { url, anonKey, email, password } = e2eEnv();
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

/** Every row that a test adds starts with this, so the clean-up never touches other rows. */
export const MARK = "E2E";
