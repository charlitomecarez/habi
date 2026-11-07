import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/lib/colors";

export type HeaderTone = "shell" | "daily" | "people" | "home" | "records";

const FIELD: Record<HeaderTone, string> = {
  shell: "bg-shell",
  daily: "bg-daily-field",
  people: "bg-people-field",
  home: "bg-home-field",
  records: "bg-records-field",
};

type ModuleHeaderProps = {
  title: string;
  subtitle?: string;
  tone?: HeaderTone;
  backLabel?: string;
  /** An icon button on the right. */
  action?: ReactNode;
};

/** A field of section colour with the back button and the title. It reaches under the status bar. */
export function ModuleHeader({ title, subtitle, tone = "shell", backLabel = "Back", action }: ModuleHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View className={`gap-1 px-3 pb-3 ${FIELD[tone]}`} style={{ marginTop: -insets.top, paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={() => router.back()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color={colors.onShell} />
        </Pressable>
        <Text accessibilityRole="header" className="min-w-0 flex-1 font-bold text-title text-on-shell">
          {title}
        </Text>
        {action}
      </View>
      {subtitle ? <Text className="px-3 font-sans text-label text-on-shell">{subtitle}</Text> : null}
    </View>
  );
}
