import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

GoogleSignin.configure({ webClientId: env.googleWebClientId });

/**
 * Android: native account picker, then exchange the Google ID token for a
 * Supabase session. Resolves false when the user cancels.
 */
export async function signInWithGoogle(): Promise<boolean> {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return false;
    }
    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error("Google did not return an ID token. Check the web client ID.");
    }
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    if (error) throw error;
    return true;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) {
      return false;
    }
    throw error;
  }
}

export async function signOutOfGoogle(): Promise<void> {
  await GoogleSignin.signOut();
}
