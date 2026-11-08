import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NewsImage } from "@/components/news/NewsImage";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { NEWS_SECTIONS, useNews, type NewsItem } from "@/lib/news";
import { timeAgo } from "@/lib/news-time";

function Story({ item, last, now }: { item: NewsItem; last: boolean; now: Date }) {
  return (
    <DataRow
      title={item.title}
      detail={`${item.source} · ${timeAgo(parseISO(item.published_at), now)}`}
      trailing={item.image_url ? <NewsImage uri={item.image_url} /> : null}
      onPress={() => router.push({ pathname: "/news/[id]", params: { id: item.id } })}
      last={last}
    />
  );
}

/** Headlines from public feeds, Philippines first. Read-only: a story opens its story page. */
export default function NewsScreen() {
  const colors = useColors();
  const news = useNews();
  const [now] = useState(() => new Date());
  const data = news.data;
  const empty = data && data.ph.length === 0 && data.world.length === 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title="News"
        subtitle={data?.lastSync ? `Updated ${format(parseISO(data.lastSync), "h:mm a")}` : undefined}
        tone="daily"
      />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-8 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={news.isRefetching}
            onRefresh={() => void news.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {news.isPending ? (
          <Skeleton />
        ) : news.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load the news. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => void news.refetch()} />
          </View>
        ) : empty || !data ? (
          <EmptyState drawing="list" title="I have no news yet" body="I check the feeds every 2 hours." />
        ) : (
          <>
            {data.down.map((feed) => (
              <Notice key={feed.source} tone="neutral">
                {feed.source} did not update
                {data.lastSync ? ` at ${format(parseISO(data.lastSync), "h:mm a")}` : ""}.
                {feed.lastOk ? ` I show its stories from ${format(parseISO(feed.lastOk), "h:mm a")}.` : ""}
              </Notice>
            ))}
            {NEWS_SECTIONS.map((section) => {
              const items = data[section.id];
              if (items.length === 0) return null;
              return (
                <View key={section.id}>
                  <Text accessibilityRole="header" className="py-2 font-semibold text-heading text-ink">
                    {section.label}
                  </Text>
                  {items.map((item, index) => (
                    <Story key={item.id} item={item} now={now} last={index === items.length - 1} />
                  ))}
                </View>
              );
            })}
            <Text className="font-sans text-caption text-ink-muted">
              Headlines and summaries from each outlet&apos;s public feed. The full story opens on its site.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
