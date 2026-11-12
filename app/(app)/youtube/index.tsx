import { format, isToday, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Thumbnail } from "@/components/youtube/Thumbnail";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { ageText, ALL_CHANNELS, groupVideos, openVideo, useYouTube } from "@/lib/youtube";

/** One list of videos from your channels, newest first. A tap opens the video in the YouTube app. */
export default function YouTubeScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  const colors = useColors();
  const youtube = useYouTube();
  const [channel, setChannel] = useState<string>(ALL_CHANNELS);
  const [now] = useState(() => new Date());
  const data = youtube.data;
  const channels = data?.channels ?? [];
  const titles = new Map(channels.map((c) => [c.channel_id, c.title]));
  const videos = (data?.videos ?? []).filter(
    (v) => titles.has(v.channel_id) && (channel === ALL_CHANNELS || v.channel_id === channel),
  );
  const lastOk = (data?.feeds ?? [])
    .map((f) => f.last_ok_at)
    .filter((t): t is string => !!t)
    .sort()
    .at(-1);
  const updated = lastOk
    ? `${isToday(parseISO(lastOk)) ? "" : `${format(parseISO(lastOk), "MMM d")}, `}${format(parseISO(lastOk), "h:mm a")}`
    : null;
  const options = [
    { value: ALL_CHANNELS, label: "All channels" },
    ...channels.map((c) => ({ value: c.channel_id, label: c.title })),
  ];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        scrollY={scrollY}
        title="YouTube"
        tone="daily"
        subtitle={
          channels.length
            ? `${channels.length} ${channels.length === 1 ? "channel" : "channels"}${updated ? ` · Updated ${updated}` : ""}`
            : undefined
        }
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerClassName="gap-4 px-5 pb-8 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={youtube.isRefetching}
            onRefresh={() => void youtube.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {youtube.isPending ? (
          <Skeleton />
        ) : youtube.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your videos. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => void youtube.refetch()} />
          </View>
        ) : channels.length === 0 ? (
          <EmptyState
            drawing="list"
            title="Add a channel, and I show its new videos here"
            body="I read each channel's public feed. Habi does not use your YouTube account."
            action={{ label: "Add a channel", onPress: () => router.push("/youtube/channels") }}
          />
        ) : (
          <>
            <DataRow
              title="Your channels"
              detail={`${channels.length} ${channels.length === 1 ? "channel" : "channels"}. Add or remove them.`}
              onPress={() => router.push("/youtube/channels")}
              chevron
              last
            />
            <Select label="Channel" options={options} value={channel} onChange={setChannel} />
            {videos.length === 0 ? (
              <EmptyState
                drawing="list"
                title="No videos in the last 60 days"
                body="I check each channel every morning."
              />
            ) : (
              groupVideos(videos).map((group) => (
                <View key={group.title}>
                  <Text accessibilityRole="header" className="py-2 font-semibold text-heading text-ink">
                    {group.title}
                  </Text>
                  {group.videos.map((v, i) => (
                    <DataRow
                      key={v.video_id}
                      leading={<Thumbnail videoId={v.video_id} seconds={v.duration_s} />}
                      title={v.title}
                      detail={`${titles.get(v.channel_id)} · ${ageText(v.published_at, now)}`}
                      onPress={() => void openVideo(v.video_id)}
                      last={i === group.videos.length - 1}
                    />
                  ))}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
