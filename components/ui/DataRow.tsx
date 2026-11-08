import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { useColors } from "@/lib/colors";

/** From this text size, a row stacks its number under the title. */
const STACK_SCALE = 1.3;

export type RowStatus = { label: string; tone: "good" | "watch" | "over" | "muted" };

const STATUS: Record<RowStatus["tone"], string> = {
  good: "text-good",
  watch: "text-watch",
  over: "text-over",
  muted: "text-ink-muted",
};

type DataRowProps = {
  title: string;
  detail?: string;
  value?: string;
  status?: RowStatus;
  onPress?: () => void;
  last?: boolean;
  /** A finished item: the title is quiet and struck through. */
  done?: boolean;
  /** A small mark before the title, such as team crests. */
  leading?: ReactNode;
  /** A chevron at the end, for a row that opens more, such as "See all apps". */
  chevron?: boolean;
};

/** Title and detail on the left, number and status word on the right. The number moves under the title when text is large. */
export function DataRow({ title, detail, value, status, onPress, last, done, leading, chevron }: DataRowProps) {
  const colors = useColors();
  // Large text moves the number under the title. A long title alone never does.
  const stacked = useWindowDimensions().fontScale >= STACK_SCALE;
  const body = (
    <View
      className={`gap-x-3 gap-y-1 py-3 ${stacked ? "" : "flex-row items-center justify-between"} ${last ? "" : "border-b-2 border-border"}`}
    >
      <View className={`min-w-0 flex-row items-center gap-3 ${stacked ? "" : "flex-1"}`}>
        {leading}
        <View className="min-w-0 flex-1 gap-1">
          <Text
            numberOfLines={2}
            className={`font-semibold text-row-title ${done ? "text-ink-muted line-through" : "text-ink"}`}
          >
            {title}
          </Text>
          {detail ? <Text className="font-sans text-caption text-ink-muted">{detail}</Text> : null}
        </View>
      </View>
      {value || status || chevron ? (
        <View className={`flex-row items-center gap-2 ${stacked ? "self-start" : ""}`}>
          {value || status ? (
            <View className={stacked ? "items-start" : "items-end"}>
              {value ? <Text className="font-bold text-amount text-ink">{value}</Text> : null}
              {status ? (
                <Text className={`font-semibold text-badge ${STATUS[status.tone]}`}>{status.label}</Text>
              ) : null}
            </View>
          ) : null}
          {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} /> : null}
        </View>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, detail, value, status?.label].filter(Boolean).join(", ")}
      onPress={onPress}
      className="min-h-touch active:bg-surface-muted"
    >
      {body}
    </Pressable>
  );
}
