import { Pressable, Text, View } from "react-native";

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
};

/** Title and detail on the left, number and status word on the right. The number moves under the title when text is large. */
export function DataRow({ title, detail, value, status, onPress, last }: DataRowProps) {
  const body = (
    <View
      className={`flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 ${last ? "" : "border-b-2 border-border"}`}
    >
      <View className="min-w-0 shrink grow gap-1">
        <Text numberOfLines={2} className="font-semibold text-row-title text-ink">
          {title}
        </Text>
        {detail ? <Text className="font-sans text-caption text-ink-muted">{detail}</Text> : null}
      </View>
      {value || status ? (
        <View className="items-end">
          {value ? <Text className="font-bold text-amount text-ink">{value}</Text> : null}
          {status ? <Text className={`font-semibold text-badge ${STATUS[status.tone]}`}>{status.label}</Text> : null}
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
