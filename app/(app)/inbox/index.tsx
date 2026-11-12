import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MessageCard } from "@/components/inbox/MessageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Fab } from "@/components/ui/Fab";
import { ModuleGate } from "@/components/ui/ModuleGate";
import { Segmented } from "@/components/ui/Segmented";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import {
  canRetry,
  markInboxRead,
  unreadCount,
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

function InboxScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  const colors = useColors();
  const access = useVoiceAccess();
  const inbox = useInbox();
  const sent = useSent();
  const retry = useRetryVoice();
  const refresh = useRefreshVoice();
  const player = useVoicePlayer();
  const unread = unreadCount(inbox.data ?? []);
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
      <ModuleHeader
        scrollY={scrollY}
        title="Inbox"
        tone="people"
        subtitle={unread > 0 ? `${unread} new ${unread === 1 ? "message" : "messages"}` : undefined}
        action={
          isAdmin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voice access"
              onPress={() => router.push("/inbox/access")}
              className="h-touch w-touch items-center justify-center"
            >
              <Ionicons name="people-outline" size={22} color={colors.ink} />
            </Pressable>
          ) : null
        }
      />

      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerClassName="gap-3 px-5 pb-fab-clear pt-3">
        {error ? <ErrorNotice lead="Could not load your messages." error={error} /> : null}
        {retry.error ? <ErrorNotice error={retry.error} /> : null}

        <Segmented label="Messages" options={TABS} value={tab} onChange={setTab} />

        {list.isPending || access.isPending ? <Skeleton /> : null}
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

/** Needs a server key; see ModuleGate. */
export default function InboxScreenGated() {
  return (
    <ModuleGate id="inbox" tone="people">
      <InboxScreen />
    </ModuleGate>
  );
}
