import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { colors } from "@/lib/colors";

type Tone = "warning" | "danger";

const classByTone: Record<Tone, { container: string; text: string; icon: string }> = {
  warning: { container: "bg-warning-tint", text: "text-warning-ink", icon: colors.warningInk },
  danger: { container: "bg-danger-tint", text: "text-danger", icon: colors.danger },
};

export function Notice({ tone, children }: { tone: Tone; children: ReactNode }) {
  const style = classByTone[tone];
  return (
    <View accessibilityRole={tone === "danger" ? "alert" : undefined} className={`flex-row items-start gap-3 rounded-input px-4 py-3 ${style.container}`}>
      <Ionicons name="alert-circle-outline" size={18} color={style.icon} />
      <Text className={`flex-1 font-sans text-caption ${style.text}`}>{children}</Text>
    </View>
  );
}
