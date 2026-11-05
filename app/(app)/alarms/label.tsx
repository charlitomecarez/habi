import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QrCode } from "@/components/inventory/QrCode";
import { STOP_LABEL } from "@/lib/alarm-rules";
import { useColors } from "@/lib/colors";

export default function StopLabelScreen() {
  const colors = useColors();
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Stop label
        </Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-3">
        <View className="overflow-hidden rounded-card border border-border">
          <QrCode value={STOP_LABEL} label="QR code that stops the alarm" />
        </View>
        <Text className="font-sans text-body text-ink-muted">
          Take a screenshot and print it. Stick it in the bathroom or the kitchen, far enough that you must get up.
        </Text>
        <Text className="font-sans text-label text-ink-muted">
          Do not keep a copy near your bed, or on another screen you can reach from it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
