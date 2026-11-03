import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { env } from "@/lib/env";

const isWeb = Platform.OS === "web";

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web returns from the Google OAuth redirect with a code in the URL.
    detectSessionInUrl: isWeb,
    flowType: isWeb ? "pkce" : "implicit",
  },
});

// On native, refresh tokens only while the app is in the foreground.
if (!isWeb) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
