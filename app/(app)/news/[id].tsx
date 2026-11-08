import { format, parseISO } from "date-fns";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { readFullStory, siteName, useStory } from "@/lib/news";
import { timeAgo } from "@/lib/news-time";

const FADE_MS = 150;

/**
 * One story: what the feed gives (image, headline, outlet, time, short summary). The full article
 * opens in an in-app browser, so the app never copies the article body.
 */
export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const story = useStory(id);
  const reduced = useReducedMotion();
  const item = story.data;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title={item?.source ?? "News"}
        subtitle={item ? timeAgo(parseISO(item.published_at)) : undefined}
        tone="daily"
      />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {story.isPending ? (
          <Skeleton layout="detail" />
        ) : story.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load this story. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => void story.refetch()} />
          </View>
        ) : !item ? (
          <View className="gap-3">
            <EmptyState drawing="list" title="This story is gone" body="Stories stay for 3 days." />
            <Button label="Back to News" variant="secondary" onPress={() => router.replace("/news")} />
          </View>
        ) : (
          <>
            {item.image_url ? (
              <View
                className="w-full overflow-hidden rounded-card border-2 border-border bg-surface-muted"
                style={{ aspectRatio: 16 / 9 }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Image
                  source={{ uri: item.image_url }}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={reduced ? 0 : FADE_MS}
                  style={{ width: "100%", height: "100%" }}
                  accessible={false}
                />
              </View>
            ) : null}
            <Text accessibilityRole="header" className="font-bold text-title text-ink">
              {item.title}
            </Text>
            <Text className="font-sans text-caption text-ink-muted">
              {item.source} · {format(parseISO(item.published_at), "EEEE, MMM d, h:mm a")}
            </Text>
            {item.summary ? <Text className="font-sans text-body text-ink">{item.summary}</Text> : null}
            <View className="gap-2 pt-2">
              <Button label="Read the full story" onPress={() => void readFullStory(item)} />
              <Text className="text-center font-sans text-caption text-ink-muted">
                Opens {siteName(item.url)} in the app
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
