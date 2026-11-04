import { Text, View } from "react-native";

import { bundledTip, topicLabel, useDailyTip } from "@/lib/tips";

/** One short tip a day. A new one starts at 12:00 AM. */
export function TipCard() {
  const tip = useDailyTip();
  const t = tip.data ?? bundledTip();
  return (
    <View className="gap-2 rounded-card border border-border bg-surface-card p-4">
      <Text className="font-semibold text-caption uppercase tracking-wide text-ink-muted">
        Tip for today · {topicLabel(t.topic)}
      </Text>
      <Text className="font-sans text-body text-ink">{t.tip}</Text>
    </View>
  );
}
