import { router } from "expo-router";
import { useEffect } from "react";
import { BackHandler, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { stopRinging } from "@/lib/alarm";

/**
 * Opens over the lock screen, with no session needed, so it shows no personal data.
 * First build: a plain Stop button. The label scan and the sums come after the locked-phone test.
 */
export default function AlarmRingingScreen() {
  // The back button must not escape the alarm.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView className="flex-1 justify-between bg-surface-page p-5">
      <View className="flex-1 items-center justify-center gap-3">
        <Text accessibilityRole="header" className="font-bold text-display text-ink">
          Gising na
        </Text>
        <Text className="font-sans text-body text-ink-muted">Test alarm</Text>
      </View>
      <Button
        label="Stop alarm"
        onPress={() => {
          stopRinging();
          router.replace("/");
        }}
      />
    </SafeAreaView>
  );
}
