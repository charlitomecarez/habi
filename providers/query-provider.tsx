import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, type Query } from "@tanstack/react-query";
import { PersistQueryClientProvider, removeOldestQuery } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import { useEffect, useState, type ReactNode } from "react";

import { fromCacheJson, toCacheJson } from "@/lib/cache-json";
import { clearHomeSummary } from "@/lib/home-summary";
import { isSaved, MAX_AGE, SECOND, STALE_TIMES } from "@/lib/query-cache";
import { supabase } from "@/lib/supabase";

function makeClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30 * SECOND, gcTime: MAX_AGE } },
  });
  for (const [key, staleTime] of STALE_TIMES) client.setQueryDefaults([key], { staleTime });
  return client;
}

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "habi-query-cache",
  throttleTime: 2 * SECOND,
  serialize: toCacheJson,
  deserialize: fromCacheJson,
  // When the cache does not fit (web storage is small), drop the oldest query and try again.
  retry: removeOldestQuery,
});

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);

  // Data on the phone must not reach the next account.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") return;
      clearHomeSummary();
      client.clear();
      void persister.removeClient();
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: MAX_AGE,
        // A new app version drops the saved cache, so a changed query never reads an old shape.
        buster: Constants.expoConfig?.version ?? "dev",
        dehydrateOptions: {
          shouldDehydrateQuery: (query: Query) => query.state.status === "success" && isSaved(query.queryKey),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
