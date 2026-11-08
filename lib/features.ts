import { useQuery } from "@tanstack/react-query";

import { ALL_FEATURES, type Features, type ModuleFilter } from "@/lib/modules";
import { useUserSettings } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { useVoiceAccess } from "@/lib/voice";

/**
 * Which keyed parts this server can run, from the app-features Edge Function (yes or no only, never
 * a key). While it loads, or if it fails, every part counts as set up, so no module flickers out.
 */
export function useFeatures(): Features {
  const query = useQuery({
    queryKey: ["app-features"],
    staleTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Partial<Features>>("app-features", { method: "GET" });
      if (error) throw error;
      return data ?? {};
    },
  });
  return { ...ALL_FEATURES, ...(query.data ?? {}) };
}

/** What this account can and wants to see: the server's features, Settings › Modules and the admin flag. */
export function useModuleFilter(): ModuleFilter {
  const features = useFeatures();
  const hidden = useUserSettings().data?.hiddenModules ?? [];
  const isAdmin = useVoiceAccess().data?.isAdmin ?? false;
  return { features, hidden, isAdmin };
}
