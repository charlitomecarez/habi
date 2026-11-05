import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { PressScale } from "@/components/ui/Motion";
import { useColors } from "@/lib/colors";
import type { AttentionItem, AttentionModule } from "@/lib/home";

const ICONS: Record<AttentionModule, ComponentProps<typeof Ionicons>["name"]> = {
  vehicle: "construct-outline",
  todo: "time-outline",
  bill: "card-outline",
  medicine: "medkit-outline",
  debt: "swap-horizontal-outline",
  date: "gift-outline",
};

/** One thing that needs you. The badge always says the status in words. */
export function AttentionCard({ item }: { item: AttentionItem }) {
  const colors = useColors();
  const danger = item.status === "Overdue";
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.detail}, ${item.status}`}
      onPress={() => router.push(item.href)}
      className="flex-row items-center gap-3 rounded-card border border-border bg-surface-card p-4 active:bg-surface-muted"
    >
      <View
        className={`h-touch w-touch items-center justify-center rounded-md ${danger ? "bg-danger-tint" : "bg-warning-tint"}`}
      >
        <Ionicons name={ICONS[item.module]} size={22} color={danger ? colors.danger : colors.warning} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
          {item.title}
        </Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {item.detail}
        </Text>
      </View>
      <Badge label={item.status} tone={danger ? "danger" : "warning"} />
    </PressScale>
  );
}
