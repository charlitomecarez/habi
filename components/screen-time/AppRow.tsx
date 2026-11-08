import { Text, View } from "react-native";

import { duration } from "@/lib/screen-time-list";

/** An app's name and time, over a bar. `share` is 0 to 1 of the bar. The name wraps; the time never cuts. */
export function AppRow({ label, totalMs, share }: { label: string; totalMs: number; share: number }) {
  return (
    <View className="gap-1 border-b-2 border-border py-2">
      <View className="flex-row justify-between gap-3">
        <Text className="min-w-0 shrink font-semibold text-label text-ink">{label}</Text>
        <Text className="font-sans text-label text-ink-muted">{duration(totalMs)}</Text>
      </View>
      <View className="h-bar bg-surface-muted" accessibilityElementsHidden importantForAccessibility="no">
        <View className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }} />
      </View>
    </View>
  );
}
