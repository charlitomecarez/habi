import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Pressable, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { durationText, type VoiceMessage } from "@/lib/voice";

function whenText(iso: string): string {
  const date = parseISO(iso);
  const day = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMM d");
  return `${day}, ${format(date, "h:mm a")}`;
}

type MessageCardProps = {
  message: VoiceMessage;
  badge?: { label: string; tone: "danger" | "warning" | "neutral" };
  /** Why there is no text yet, for the sender. */
  fallback?: string;
  playing: boolean;
  onPlay: (path: string) => void;
  onRetry?: () => void;
};

/** Text first. Play audio is there for a line that looks wrong. */
export function MessageCard({ message, badge, fallback, playing, onPlay, onRetry }: MessageCardProps) {
  const path = message.audio_path;
  return (
    <View className="gap-2 rounded-card border border-border bg-surface-card p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 font-sans text-caption text-ink-muted">
          {whenText(message.created_at)} · {durationText(message.duration_s)}
        </Text>
        {badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
      </View>
      <Text selectable className="font-sans text-body text-ink">
        {message.transcript ?? fallback}
      </Text>
      <View className="flex-row gap-4">
        {path ? (
          <Pressable accessibilityRole="button" onPress={() => onPlay(path)} className="h-touch justify-center">
            <Text className="font-semibold text-label text-accent">{playing ? "Pause audio" : "Play audio"}</Text>
          </Pressable>
        ) : (
          <Text className="py-2 font-sans text-caption text-ink-muted">Audio deleted after 7 days</Text>
        )}
        {onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry} className="h-touch justify-center">
            <Text className="font-semibold text-label text-accent">Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
