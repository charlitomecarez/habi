import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { useColors } from "@/lib/colors";

type Tone = "warning" | "danger" | "neutral";

const classByTone: Record<Tone, { container: string; text: string; icon: "watch" | "over" | "inkMuted" }> = {
  warning: { container: "border-2 border-watch", text: "text-watch", icon: "watch" },
  danger: { container: "border-2 border-over", text: "text-over", icon: "over" },
  neutral: { container: "bg-surface-muted", text: "text-ink", icon: "inkMuted" },
};

export function Notice({ tone, children }: { tone: Tone; children: ReactNode }) {
  const colors = useColors();
  const style = classByTone[tone];
  return (
    <View
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      className={`flex-row items-start gap-3 rounded-input px-4 py-3 ${style.container}`}
    >
      <Ionicons name="alert-circle-outline" size={18} color={colors[style.icon]} />
      <Text className={`flex-1 font-sans text-caption ${style.text}`}>{children}</Text>
    </View>
  );
}
