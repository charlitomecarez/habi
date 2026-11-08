import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";

import { downFeeds } from "@/lib/news-time";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

// Headlines that news-sync reads from public RSS feeds. Every signed-in account reads the same rows,
// and only the Edge Function writes them. A story opens a story page; the full article opens in an
// in-app browser (Chrome Custom Tabs on Android, a new tab on the web). No article body is stored.

export type NewsItem = Tables<"news_items">;
export type NewsSection = "ph" | "world";

export const NEWS_SECTIONS: readonly { id: NewsSection; label: string }[] = [
  { id: "ph", label: "Philippines" },
  { id: "world", label: "World" },
];

/** Stories shown per section. */
export const PER_SECTION = 20;

const KEY = ["news"] as const;

function section(id: NewsSection, limit: number) {
  return supabase
    .from("news_items")
    .select("*")
    .eq("section", id)
    .order("published_at", { ascending: false })
    .limit(limit);
}

export function useNews() {
  return useQuery({
    queryKey: KEY,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [ph, world, sync] = await Promise.all([
        section("ph", PER_SECTION),
        section("world", PER_SECTION),
        supabase.from("news_sync").select("*"),
      ]);
      if (ph.error) throw ph.error;
      if (world.error) throw world.error;
      if (sync.error) throw sync.error;
      const lastSync = sync.data
        .map((s) => s.last_ok_at)
        .filter((t): t is string => t !== null)
        .sort()
        .at(-1);
      return { ph: ph.data, world: world.data, down: downFeeds(sync.data), lastSync: lastSync ?? null };
    },
  });
}

/** The newest Philippine headlines, for Home. */
export function useLatestNews(count = 3, enabled = true) {
  return useQuery({
    queryKey: [...KEY, "latest", count],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await section("ph", count);
      if (error) throw error;
      return data;
    },
  });
}

/** One story, for the story page. Null when it is gone (older than 3 days). */
export function useStory(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "story", id],
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("news_items").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** The site's name for the line under the button, such as "inquirer.net". */
export function siteName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the outlet's site";
  }
}

/** The full article in an in-app browser that slides over my-app. Back returns to the story. */
export const readFullStory = (item: Pick<NewsItem, "url">) =>
  WebBrowser.openBrowserAsync(item.url, { showTitle: true, enableBarCollapsing: true });
