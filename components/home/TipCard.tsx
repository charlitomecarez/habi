import { Text, View } from "react-native";

import { bundledTip, topicLabel, useDailyTip } from "@/lib/tips";

/** One short tip a day. A new one starts at 12:00 AM. */
export function TipCard() {
  const tip = useDailyTip();
  const t = tip.data ?? bundledTip();
  return (
    <View className="gap-1">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        Tip for today
      </Text>
      <Text className="font-sans text-caption text-ink-muted">{topicLabel(t.topic)}</Text>
      <Text className="font-sans text-body text-ink">{t.tip}</Text>
    </View>
  );
}
