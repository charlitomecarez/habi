import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import type { Video } from "@/lib/content";
import { nextAction, progress, relativeDay, daysFrom, stage } from "@/lib/content/stages";

/** The publish date with a status word: "Publish today", "3 days late", "Publish Friday". */
export function publishStatus(video: Pick<Video, "publish_on" | "stage">, now = new Date()) {
  if (!video.publish_on || video.stage === "published") return null;
  const days = daysFrom(video.publish_on, now);
  const when = relativeDay(video.publish_on, now);
  if (days < 0) return { text: `Late · ${when}`, tone: "danger" as const };
  if (days === 0) return { text: "Publish today", tone: "warning" as const };
  if (days <= 3) return { text: `Publish ${when}`, tone: "warning" as const };
  return { text: `Publish ${when}`, tone: "neutral" as const };
}

/** One line for what to do next on a video. */
export function nextActionText(video: Video): string {
  const action = nextAction(video);
  if (action.kind === "done") return "Published";
  if (action.kind === "advance") return `Ready for ${action.to.label}`;
  return action.step.label;
}

/** A video in a list. Tapping it opens the video. */
export function VideoCard({ video, last = false }: { video: Video; last?: boolean }) {
  const status = publishStatus(video);
  const pct = Math.round(progress(video) * 100);
  const next = nextActionText(video);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        video.title,
        `${stage(video.stage).label} stage`,
        `next: ${next}`,
        status?.text,
        `${pct}% done`,
      ]
        .filter(Boolean)
        .join(", ")}
      onPress={() => router.push({ pathname: "/content/video/[id]", params: { id: video.id } })}
      className={`min-h-touch gap-2 px-4 py-3 active:bg-surface-muted ${last ? "" : "border-b border-divider"}`}
    >
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-row-title text-ink">
          {video.title}
        </Text>
        {status ? <Badge label={status.text} tone={status.tone} /> : null}
      </View>
      <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
        {stage(video.stage).label} · {next}
      </Text>
      <View className="h-bar overflow-hidden rounded-pill bg-divider">
        <View className="h-bar rounded-pill bg-accent" style={{ width: `${pct}%` }} />
      </View>
    </Pressable>
  );
}
