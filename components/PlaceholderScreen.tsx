import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ui/ScreenHeader";

type PlaceholderScreenProps = {
  title: string;
  phase: number;
  children?: ReactNode;
};

/** Tab content until the module's phase is built. */
export function PlaceholderScreen({ title, phase, children }: PlaceholderScreenProps) {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <View className="flex-1 gap-6 px-5 pt-6">
        <ScreenHeader title={title} />
        <View className="gap-1 rounded-card border border-border bg-surface-card p-4">
          <Text className="font-semibold text-heading text-ink">Coming in phase {phase}</Text>
          <Text className="font-sans text-caption text-ink-muted">
            This module is not built yet.
          </Text>
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
}
