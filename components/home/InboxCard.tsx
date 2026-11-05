import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useColors } from "@/lib/colors";
import { unreadCount, useInbox, useVoicePair } from "@/lib/voice";

/** One tap to record, for a paired account. An account with no partner sees nothing here. */
export function InboxCard() {
  const colors = useColors();
  const pair = useVoicePair();
  const inbox = useInbox();
  if (!pair.data) return null;

  const unread = unreadCount(inbox.data ?? []);
  return (
    <View className="flex-row items-center gap-2 rounded-card border border-border bg-surface-card p-2">
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/inbox")}
        className="min-h-touch flex-1 justify-center rounded-input px-2 active:bg-surface-muted"
      >
        <Text className="font-semibold text-row-title text-ink">Voice Inbox</Text>
        <Text className="font-sans text-caption text-ink-muted">
          {unread === 0 ? "No new messages" : `${unread} new ${unread === 1 ? "message" : "messages"}`}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Record a voice message"
        onPress={() => router.push("/inbox/record")}
        className="h-touch w-touch items-center justify-center rounded-pill bg-people-tint active:bg-surface-muted"
      >
        <Ionicons name="mic-outline" size={22} color={colors.people} />
      </Pressable>
    </View>
  );
}
