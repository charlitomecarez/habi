import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Pressable, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import { durationText, type VoiceMessage } from "@/lib/voice";
import type { AudioView } from "@/lib/voice-audio";

const PLAY_LABEL = {
  ready: "Play audio",
  loading: "Loading audio…",
  playing: "Pause audio",
  failed: "Try again",
};

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
  audio: AudioView;
  onPlay: (path: string) => void;
  onRetry?: () => void;
};

/** Text first. Play audio is there for a line that looks wrong. */
export function MessageCard({ message, badge, fallback, audio, onPlay, onRetry }: MessageCardProps) {
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
      {audio.state === "failed" ? (
        <Notice tone="danger">Could not play this audio. Check your connection.</Notice>
      ) : null}
      <View className="flex-row items-center gap-4">
        {path ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: audio.state === "loading" }}
            disabled={audio.state === "loading"}
            onPress={() => onPlay(path)}
            className="h-touch justify-center"
          >
            <Text className="font-semibold text-label text-accent">{PLAY_LABEL[audio.state]}</Text>
          </Pressable>
        ) : (
          <Text className="py-2 font-sans text-caption text-ink-muted">Audio deleted after 7 days</Text>
        )}
        {audio.state === "playing" ? (
          <View className="flex-1 flex-row items-center gap-2">
            <View className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <View
                className="h-full bg-accent"
                style={{ width: `${audio.duration > 0 ? Math.min(100, (audio.position / audio.duration) * 100) : 0}%` }}
              />
            </View>
            <Text className="font-sans text-caption text-ink-muted">
              {durationText(Math.floor(audio.position))} / {durationText(Math.round(audio.duration))}
            </Text>
          </View>
        ) : null}
        {onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry} className="h-touch justify-center">
            <Text className="font-semibold text-label text-accent">Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
