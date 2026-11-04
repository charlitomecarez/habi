import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { signOutOfGoogle } from "@/lib/google-sign-in";
import { supabase } from "@/lib/supabase";
import { lockVault } from "@/lib/vault";

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function signOut() {
  lockVault();
  await signOutOfGoogle();
  await supabase.auth.signOut();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "SIGNED_IN") {
        // Adds the default accounts and categories once; a no-op after that.
        // Deferred: Supabase deadlocks on an await inside this callback.
        setTimeout(() => {
          supabase.rpc("seed_money_defaults").then(({ error }) => {
            if (error) console.warn("seed_money_defaults failed", error.message);
          });
        }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, isLoading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
