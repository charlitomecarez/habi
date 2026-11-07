import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MessageCard } from "@/components/inbox/MessageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import {
  canRetry,
  markInboxRead,
  useInbox,
  useRefreshVoice,
  useRetryVoice,
  useSent,
  useVoiceAccess,
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
  const access = useVoiceAccess();
  const inbox = useInbox();
  const sent = useSent();
  const retry = useRetryVoice();
  const refresh = useRefreshVoice();
  const player = useVoicePlayer();
  const [tab, setTab] = useState<Tab>("inbox");

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
  const isAdmin = access.data?.isAdmin ?? false;
  const hasAccess = access.data?.hasAccess ?? false;
  const canRecord = (access.data?.contacts.length ?? 0) > 0;
  const error = access.error ?? list.error;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="people">
        <Text accessibilityRole="header" className="flex-1 font-bold text-title text-on-shell">
          Inbox
        </Text>
        {isAdmin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voice access"
            onPress={() => router.push("/inbox/access")}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="people-outline" size={22} color={colors.onShell} />
          </Pressable>
        ) : null}
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-3 px-5 pb-32 pt-3">
        {error ? <Notice tone="danger">Could not load your messages. {error.message}</Notice> : null}
        {retry.error ? <Notice tone="danger">{retry.error.message}</Notice> : null}

        <Segmented label="Messages" options={TABS} value={tab} onChange={setTab} />

        {list.isPending || access.isPending ? <ActivityIndicator color={colors.accent} className="py-8" /> : null}
        {!list.isPending && !access.isPending && messages.length === 0 ? (
          isAdmin && !canRecord ? (
            <EmptyState
              drawing="list"
              title="Nobody has voice yet"
              body="Tick an account, and you can message each other."
              action={{ label: "Choose accounts", onPress: () => router.push("/inbox/access") }}
            />
          ) : !hasAccess ? (
            <EmptyState drawing="list" title="Voice is off for this account" body="The admin can turn it on for you." />
          ) : (
            <EmptyState
              drawing="list"
              title={tab === "inbox" ? "No messages yet" : "Nothing sent yet"}
              body={tab === "inbox" ? "Voice messages show here as text." : "Tap the microphone to record."}
            />
          )
        ) : null}

        {messages.map((message) =>
          tab === "inbox" ? (
            <MessageCard
              key={message.id}
              message={message}
              badge={message.read_at === null ? { label: "New", tone: "warning" } : undefined}
              audio={player.view(message.audio_path)}
              onPlay={(path) => void player.toggle(path)}
            />
          ) : (
            <MessageCard
              key={message.id}
              message={message}
              badge={sentBadge(message)}
              fallback={message.status === "pending" ? "The text is on its way." : "The text could not be made."}
              audio={player.view(message.audio_path)}
              onPlay={(path) => void player.toggle(path)}
              onRetry={canRetry(message) ? () => retry.mutate(message.id) : undefined}
            />
          ),
        )}
      </ScrollView>

      {canRecord ? (
        <Fab label="Record a voice message" icon="mic" onPress={() => router.push("/inbox/record")} />
      ) : null}
    </SafeAreaView>
  );
}
