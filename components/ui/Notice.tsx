import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { useColors } from "@/lib/colors";

type Tone = "warning" | "danger";

const classByTone: Record<Tone, { container: string; text: string; icon: "warningInk" | "danger" }> = {
  warning: { container: "bg-warning-tint", text: "text-warning-ink", icon: "warningInk" },
  danger: { container: "bg-danger-tint", text: "text-danger", icon: "danger" },
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
