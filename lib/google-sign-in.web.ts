import { supabase } from "@/lib/supabase";

/**
 * Web: full-page redirect to Google through Supabase. The page leaves, so
 * this resolves only if the redirect fails to start.
 */
export async function signInWithGoogle(): Promise<boolean> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return false;
}

export async function signOutOfGoogle(): Promise<void> {}
