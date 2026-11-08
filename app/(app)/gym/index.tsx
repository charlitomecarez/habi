import { Ionicons } from "@expo/vector-icons";
import { addMonths, isSameMonth } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { isGymDay, today, trainedOrMissed, useGym } from "@/lib/gym";
import { scheduleText, timeLabel } from "@/lib/habits";

export default function GymScreen() {
  const colors = useColors();
  const gym = useGym();
  const now = new Date();
  const [month, setMonth] = useState(now);
  const plans = gym.data?.plans ?? [];
  const sessions = gym.data?.sessions ?? [];
  const exerciseCount = (id: string) => gym.data?.exercises.filter((e) => e.plan_id === id).length ?? 0;
  const dueToday = plans.filter((p) => isGymDay(p, now));
  const trainedCount = sessions.filter((s) => isSameMonth(new Date(`${s.on_date}T00:00:00`), month)).length;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="daily">
        <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
          Gym
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-fab-clear pt-2">
        {gym.isPending ? (
          <Skeleton />
        ) : gym.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your workouts. {gym.error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => gym.refetch()} />
          </View>
        ) : plans.length === 0 ? (
          <View className="items-center gap-2 py-6">
            <Ionicons name="barbell-outline" size={28} color={colors.accent} />
            <Text className="text-center font-sans text-body text-ink-muted">
              Write your plan once: add a workout day, pick its days and its exercises.
            </Text>
          </View>
        ) : (
          <>
            <View className="gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Today
              </Text>
              {dueToday.length === 0 ? (
                <View className="py-1">
                  <Text className="font-sans text-caption text-ink-muted">Rest day. No workout on the plan today.</Text>
                </View>
              ) : (
                dueToday.map((p) => {
                  const started = sessions.some((s) => s.plan_id === p.id && s.on_date === today());
                  return (
                    <View key={p.id} className="gap-3 rounded-card border border-border bg-surface-card p-4">
                      <Text className="font-bold text-title text-ink">{p.name}</Text>
                      <Text className="font-sans text-caption text-ink">
                        {exerciseCount(p.id)} exercises{started ? " · started" : ""}
                      </Text>
                      <Button
                        label={started ? "Continue workout" : "Start workout"}
                        size="input"
                        onPress={() => router.push({ pathname: "/gym/session/[planId]", params: { planId: p.id } })}
                      />
                    </View>
                  );
                })
              )}
            </View>

            <View className="gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Trained · {trainedCount} {trainedCount === 1 ? "session" : "sessions"} this month
              </Text>
              <View>
                <MonthCalendar
                  month={month}
                  onPrevious={() => setMonth(addMonths(month, -1))}
                  onNext={() => setMonth(addMonths(month, 1))}
                  canGoNext={!isSameMonth(month, now)}
                  selected={null}
                  onSelect={() => undefined}
                  describeDay={(date) => {
                    const s = trainedOrMissed(plans, sessions, date, now);
                    return s === "trained" ? "trained" : s === "missed" ? "missed" : undefined;
                  }}
                  renderDay={(date) => {
                    const s = trainedOrMissed(plans, sessions, date, now);
                    if (s === "trained")
                      return <Text className="font-semibold text-tab-label text-accent-strong">Trained</Text>;
                    if (s === "missed") return <Text className="font-medium text-tab-label text-danger">Missed</Text>;
                    return null;
                  }}
                />
              </View>
            </View>

            <View className="gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Workout days
              </Text>
              <View>
                {plans.map((p, i) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name}, ${scheduleText({ schedule: "weekdays", weekdays: p.weekdays, times_per_week: null })}. Edit`}
                    onPress={() => router.push({ pathname: "/gym/plan/[id]", params: { id: p.id } })}
                    className={`min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted ${i === plans.length - 1 ? "" : "border-b-2 border-border"}`}
                  >
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="font-semibold text-row-title text-ink">{p.name}</Text>
                      <Text className="font-sans text-caption text-ink-muted">
                        {scheduleText({ schedule: "weekdays", weekdays: p.weekdays, times_per_week: null })} ·{" "}
                        {exerciseCount(p.id)} exercises · {timeLabel(p.remind_time)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Fab label="Add workout day" onPress={() => router.push("/gym/plan/new")} />
    </SafeAreaView>
  );
}
