import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Input } from "@/components/ui/Input";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { errorText } from "@/lib/errors";
import { motion } from "@/lib/motion";
import {
  ageText,
  feedFailed,
  MAX_CHANNELS,
  useAddChannel,
  useRemoveChannel,
  useRestoreChannel,
  useYouTube,
  type Channel,
} from "@/lib/youtube";

/** Add a channel by its link or @handle, or remove one. Add channel is the one primary action. */
export default function ChannelsScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  const colors = useColors();
  const youtube = useYouTube();
  const add = useAddChannel();
  const remove = useRemoveChannel();
  const restore = useRestoreChannel();
  const [input, setInput] = useState("");
  const [removed, setRemoved] = useState<Channel | null>(null);
  const [now] = useState(() => new Date());
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  const channels = youtube.data?.channels ?? [];
  const feeds = new Map((youtube.data?.feeds ?? []).map((f) => [f.channel_id, f]));
  const lastVideo = new Map<string, string>();
  for (const v of youtube.data?.videos ?? [])
    if (!lastVideo.has(v.channel_id)) lastVideo.set(v.channel_id, v.published_at);
  const full = channels.length >= MAX_CHANNELS;

  function onAdd() {
    add.mutate(input, { onSuccess: () => setInput("") });
  }

  function onRemove(channel: Channel) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setRemoved(channel);
    undoTimer.current = setTimeout(() => setRemoved(null), motion.undo);
    remove.mutate(channel.id);
  }

  function onUndo() {
    if (!removed) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    restore.mutate(removed);
    setRemoved(null);
  }

  function detail(channel: Channel): string {
    if (feedFailed(feeds.get(channel.channel_id))) return "Could not check this channel today";
    const last = lastVideo.get(channel.channel_id);
    if (!last) return "No video in the last 60 days";
    const age = ageText(last, now);
    return `Last video ${/ago$/.test(age) ? "today" : age === "Yesterday" ? "yesterday" : format(parseISO(last), "MMM d")}`;
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        scrollY={scrollY}
        title="Your channels"
        tone="daily"
        subtitle={youtube.data ? `${channels.length} of ${MAX_CHANNELS} channels` : undefined}
      />
      <KeyboardScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-4 px-5 pb-8 pt-4"
      >
        {removed ? (
          <View className="flex-row items-center gap-3 rounded-input bg-surface-muted pl-4">
            <Text className="flex-1 font-sans text-caption text-ink" accessibilityLiveRegion="polite">
              Removed {removed.title}.
            </Text>
            <Button label="Undo" variant="plain" size="input" onPress={onUndo} />
          </View>
        ) : null}
        <View className="gap-3">
          <Input
            label="Channel link or @handle"
            value={input}
            onChangeText={(text) => {
              setInput(text);
              if (add.error) add.reset();
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="@kusinalab"
            editable={!full && !add.isPending}
            error={errorText(add.error)}
            onSubmitEditing={onAdd}
          />
          {full ? <Notice tone="neutral">You follow {MAX_CHANNELS} channels. Remove one to add another.</Notice> : null}
          <Button label="Add channel" loading={add.isPending} disabled={full || !input.trim()} onPress={onAdd} />
        </View>
        {remove.error || restore.error ? <Notice tone="danger">Could not save the change. Try again.</Notice> : null}
        <View>
          {youtube.isPending ? (
            <Skeleton rows={5} />
          ) : youtube.error ? (
            <Notice tone="danger">Could not load your channels. Check your connection.</Notice>
          ) : channels.length === 0 ? (
            <Text className="py-3 font-sans text-body text-ink-muted">
              No channels yet. Paste a channel link above.
            </Text>
          ) : (
            channels.map((channel, index) => (
              <DataRow
                key={channel.id}
                title={channel.title}
                detail={detail(channel)}
                last={index === channels.length - 1}
                trailing={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${channel.title}`}
                    onPress={() => onRemove(channel)}
                    className="h-touch w-touch items-center justify-center rounded-pill active:bg-surface-muted"
                  >
                    <Ionicons name="close" size={20} color={colors.inkMuted} />
                  </Pressable>
                }
              />
            ))
          )}
        </View>
      </KeyboardScrollView>
    </SafeAreaView>
  );
}
