import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlarmSheet } from "@/components/alarms/AlarmSheet";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import {
  alarmSetup,
  getAlarms,
  isAlarmSupported,
  openAppSettings,
  openFullScreenSettings,
  putAlarm,
  ringTestAlarm,
  type Alarm,
  type AlarmSetup,
} from "@/lib/alarm";
import { alarmTimeText, daysText, isUserAlarm, nextAlarmText } from "@/lib/alarm-rules";
import { useColors } from "@/lib/colors";

function SetupRow({ title, ready, onPress }: { title: string; ready: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${ready ? "Ready" : "Fix this"}`}
      onPress={ready ? undefined : onPress}
      className="min-h-touch flex-row items-center justify-between gap-3 border-b border-divider px-4 py-3"
    >
      <Text className="flex-1 font-medium text-row-title text-ink">{title}</Text>
      <Badge label={ready ? "Ready" : "Fix this"} tone={ready ? "neutral" : "warning"} />
    </Pressable>
  );
}

const listAlarms = () =>
  getAlarms()
    .filter(isUserAlarm)
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

export default function AlarmsScreen() {
  const colors = useColors();
  const [alarms, setAlarms] = useState<Alarm[]>(listAlarms);
  const [setup, setSetup] = useState<AlarmSetup | null>(() => alarmSetup());
  const [camera, requestCamera] = useCameraPermissions();
  const [editing, setEditing] = useState<{ alarm: Alarm | null; key: number } | null>(null);
  const [tested, setTested] = useState(false);

  // The checks run again when you come back from Settings, and after a ring changes the list.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      setSetup(alarmSetup());
      setAlarms(listAlarms());
    });
    return () => sub.remove();
  }, []);

  const next = nextAlarmText(alarms);

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

      {!isAlarmSupported ? (
        <View className="px-5 pt-3">
          <Notice tone="warning">Alarms work only in the Android app, on a build that includes them.</Notice>
        </View>
      ) : (
        <>
          <ScrollView contentContainerClassName="gap-5 px-5 pb-32 pt-3">
            {next ? <Text className="font-sans text-label text-ink-muted">{next}</Text> : null}

            {alarms.length === 0 ? (
              <EmptyState drawing="calendar" title="No alarms yet" body="Add one, then print your stop label." />
            ) : (
              <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                {alarms.map((alarm, index) => (
                  <Pressable
                    key={alarm.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Change alarm at ${alarmTimeText(alarm)}`}
                    onPress={() => setEditing({ alarm, key: Date.now() })}
                    className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${index === alarms.length - 1 ? "" : "border-b border-divider"}`}
                  >
                    <View className="min-w-0 flex-1">
                      <Text className="font-bold text-title text-ink">{alarmTimeText(alarm)}</Text>
                      <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
                        {[daysText(alarm.days), alarm.label].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel={`Alarm at ${alarmTimeText(alarm)}`}
                      value={alarm.enabled}
                      trackColor={{ true: colors.accent }}
                      onValueChange={(enabled) => {
                        putAlarm({ ...alarm, enabled });
                        setAlarms(listAlarms());
                      }}
                    />
                  </Pressable>
                ))}
              </View>
            )}

            <View className="gap-3">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                How you stop it
              </Text>
              <Text className="font-sans text-label text-ink-muted">
                Scan your label, then solve 3 easy sums. Stick the label away from your bed.
              </Text>
              <Button
                label="Show stop label"
                variant="secondary"
                size="input"
                onPress={() => router.push("/alarms/label")}
              />
            </View>

            {setup ? (
              <View className="gap-3">
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  Setup check
                </Text>
                <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                  <SetupRow title="Notifications" ready={setup.notifications} onPress={openAppSettings} />
                  <SetupRow title="Full-screen alarm" ready={setup.fullScreen} onPress={openFullScreenSettings} />
                  <SetupRow title="Battery set to Unrestricted" ready={setup.battery} onPress={openAppSettings} />
                  <SetupRow
                    title="Camera, for the stop label"
                    ready={camera?.granted ?? false}
                    onPress={() => (camera?.canAskAgain === false ? openAppSettings() : requestCamera())}
                  />
                </View>
              </View>
            ) : null}

            <Button
              label={tested ? "Test alarm set" : "Ring a test in 1 minute"}
              variant="secondary"
              size="input"
              onPress={() => {
                ringTestAlarm();
                setTested(true);
              }}
            />
          </ScrollView>
          <Fab label="Add alarm" onPress={() => setEditing({ alarm: null, key: Date.now() })} />
        </>
      )}

      {editing ? (
        <AlarmSheet
          key={editing.key}
          visible
          alarm={editing.alarm}
          onClose={() => setEditing(null)}
          onChanged={() => setAlarms(listAlarms())}
        />
      ) : null}
    </SafeAreaView>
  );
}
