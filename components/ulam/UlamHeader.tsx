import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useColors } from "@/lib/colors";

/** The back button, the title and an optional action. */
export function UlamHeader({ title, action }: { title: string; action?: ReactNode }) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        className="h-touch w-touch items-center justify-center"
      >
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} className="flex-1 font-bold text-title text-ink">
        {title}
      </Text>
      {action}
    </View>
  );
}
