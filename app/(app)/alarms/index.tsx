import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import {
  alarmSetup,
  isAlarmSupported,
  openAppSettings,
  openFullScreenSettings,
  ringTestAlarm,
  type AlarmSetup,
} from "@/lib/alarm";
import { useColors } from "@/lib/colors";

function SetupRow({ title, ready, onPress }: { title: string; ready: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${title}, ${ready ? "Ready" : "Fix this"}`}
      onPress={ready ? undefined : onPress}
      className="min-h-touch flex-row items-center justify-between gap-3 border-b border-divider px-4 py-3"
    >
      <Text className="flex-1 font-medium text-row-title text-ink">{title}</Text>
      <Badge label={ready ? "Ready" : "Fix this"} tone={ready ? "neutral" : "warning"} />
    </Pressable>
  );
}

/** First build: the setup check and a test ring. The alarm list comes after the locked-phone test. */
export default function AlarmsScreen() {
  const colors = useColors();
  const [setup, setSetup] = useState<AlarmSetup | null>(() => alarmSetup());
  const [armed, setArmed] = useState(false);

  // The check runs again when you come back from Settings.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setSetup(alarmSetup());
    });
    return () => sub.remove();
  }, []);

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
          Alarms
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-3">
        {!isAlarmSupported ? (
          <Notice tone="warning">Alarms work only in the Android app, on a build that includes them.</Notice>
        ) : (
          <>
            {setup ? (
              <View className="gap-3">
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  Setup check
                </Text>
                <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                  <SetupRow title="Notifications" ready={setup.notifications} onPress={openAppSettings} />
                  <SetupRow title="Full-screen alarm" ready={setup.fullScreen} onPress={openFullScreenSettings} />
                  <SetupRow title="Battery set to Unrestricted" ready={setup.battery} onPress={openAppSettings} />
                </View>
              </View>
            ) : null}

            <Text className="font-sans text-body text-ink-muted">
              Tap the button, lock the phone and wait one minute. The alarm must ring and open over the lock screen.
            </Text>
            <Button
              label={armed ? "Test alarm set" : "Ring in 1 minute"}
              onPress={() => {
                ringTestAlarm();
                setArmed(true);
              }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
