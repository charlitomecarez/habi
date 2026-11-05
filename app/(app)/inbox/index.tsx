import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MessageCard } from "@/components/inbox/MessageCard";
import { EnterCodeSheet, MakeCodeSheet } from "@/components/inbox/PairSheets";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useColors } from "@/lib/colors";
import {
  canRetry,
  markInboxRead,
  useInbox,
  useRefreshVoice,
  useRetryVoice,
  useSent,
  useUnpair,
  useVoicePair,
  type VoiceMessage,
} from "@/lib/voice";
import { useVoicePlayer } from "@/lib/voice-audio";

type Tab = "inbox" | "sent";

const TABS = [
  { value: "inbox", label: "Inbox" },
  { value: "sent", label: "Sent" },
] as const;

function sentBadge(message: VoiceMessage) {
  if (message.status === "ready") return { label: "Sent", tone: "neutral" } as const;
  if (message.status === "failed" || canRetry(message)) return { label: "Failed", tone: "danger" } as const;
  return { label: "Making text", tone: "warning" } as const;
}

export default function InboxScreen() {
  const colors = useColors();
  const pair = useVoicePair();
  const inbox = useInbox();
  const sent = useSent();
  const retry = useRetryVoice();
  const unpair = useUnpair();
  const refresh = useRefreshVoice();
  const player = useVoicePlayer();
  const [tab, setTab] = useState<Tab>("inbox");
  const [sheet, setSheet] = useState<"make" | "enter" | "options" | null>(null);

  // Opening the screen reads the inbox. New stays on the cards until you leave.
  useFocusEffect(
    useCallback(() => {
      markInboxRead().catch(() => undefined);
      return () => {
        void refresh();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const list = tab === "inbox" ? inbox : sent;
  const messages = list.data ?? [];
  const paired = Boolean(pair.data);
  const error = pair.error ?? list.error;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="flex-1 font-bold text-title text-ink">
          Inbox
        </Text>
        {paired ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Inbox options"
            onPress={() => setSheet("options")}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="options-outline" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerClassName="gap-3 px-5 pb-32 pt-3">
        {error ? <Notice tone="danger">Could not load your messages. {error.message}</Notice> : null}
        {retry.error ? <Notice tone="danger">{retry.error.message}</Notice> : null}
        {player.error ? <Notice tone="danger">{player.error}</Notice> : null}

        {pair.isPending ? <ActivityIndicator color={colors.accent} className="py-8" /> : null}

        {!pair.isPending && !paired ? (
          <View className="gap-3">
            <EmptyState
              drawing="list"
              title="Pair with your partner"
              body="Record a message, and your partner reads it as text. An outside service, Groq, makes the text."
            />
            <Button label="Make a pairing code" onPress={() => setSheet("make")} />
            <Button label="Enter a pairing code" variant="secondary" onPress={() => setSheet("enter")} />
          </View>
        ) : null}

        {paired ? <Segmented label="Messages" options={TABS} value={tab} onChange={setTab} /> : null}

        {paired && list.isPending ? <ActivityIndicator color={colors.accent} className="py-8" /> : null}
        {paired && !list.isPending && messages.length === 0 ? (
          <EmptyState
            drawing="list"
            title={tab === "inbox" ? "No messages yet" : "Nothing sent yet"}
            body={tab === "inbox" ? "Messages from your partner show here as text." : "Tap the microphone to record."}
          />
        ) : null}

        {paired
          ? messages.map((message) =>
              tab === "inbox" ? (
                <MessageCard
                  key={message.id}
                  message={message}
                  badge={message.read_at === null ? { label: "New", tone: "warning" } : undefined}
                  playing={player.playingPath === message.audio_path}
                  onPlay={(path) => void player.toggle(path)}
                />
              ) : (
                <MessageCard
                  key={message.id}
                  message={message}
                  badge={sentBadge(message)}
                  fallback={message.status === "pending" ? "The text is on its way." : "The text could not be made."}
                  playing={player.playingPath === message.audio_path}
                  onPlay={(path) => void player.toggle(path)}
                  onRetry={canRetry(message) ? () => retry.mutate(message.id) : undefined}
                />
              ),
            )
          : null}
      </ScrollView>

      {paired ? <Fab label="Record a voice message" icon="mic" onPress={() => router.push("/inbox/record")} /> : null}

      <MakeCodeSheet visible={sheet === "make"} onClose={() => setSheet(null)} />
      <EnterCodeSheet visible={sheet === "enter"} onClose={() => setSheet(null)} />
      <Sheet
        visible={sheet === "options"}
        onClose={() => setSheet(null)}
        title="Inbox options"
        subtitle="Unpairing stops new messages for both of you. Past text stays."
      >
        <View className="gap-3 px-5 pb-5 pt-4">
          {unpair.error ? <Notice tone="danger">{unpair.error.message}</Notice> : null}
          <Button
            label="Unpair accounts"
            variant="destructive"
            loading={unpair.isPending}
            onPress={() => unpair.mutate(undefined, { onSuccess: () => setSheet(null) })}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
