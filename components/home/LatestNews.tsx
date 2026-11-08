import { parseISO } from "date-fns";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { NewsImage } from "@/components/news/NewsImage";
import { DataRow } from "@/components/ui/DataRow";
import { useLatestNews } from "@/lib/news";
import { useUserSettings } from "@/lib/settings";
import { timeAgo } from "@/lib/news-time";

/** The 3 newest Philippine headlines and a row to News. It hides, heading too, when there is no news. */
export function LatestNews({ ready }: { ready: boolean }) {
  const off = (useUserSettings().data?.hiddenModules ?? []).includes("news");
  const news = useLatestNews(3, ready && !off);
  const items = news.data ?? [];
  if (!ready || off || items.length === 0) return null;
  const now = new Date();

  return (
    <View>
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        News
      </Text>
      {items.map((item) => (
        <DataRow
          key={item.id}
          title={item.title}
          detail={`${item.source} · ${timeAgo(parseISO(item.published_at), now)}`}
          trailing={item.image_url ? <NewsImage uri={item.image_url} /> : null}
          onPress={() => router.push({ pathname: "/news/[id]", params: { id: item.id } })}
        />
      ))}
      <DataRow title="All news" onPress={() => router.push("/news")} chevron last />
    </View>
  );
}
