import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { day, isScheduled, scheduleText, streak, useHabits, useToggleCheck, weekCount, type Habit } from "@/lib/habits";

function HabitRow({ h, checks, last }: { h: Habit; checks: Set<string>; last: boolean }) {
  const colors = useColors();
  const toggle = useToggleCheck();
  const today = day(new Date());
  const done = checks.has(today);
  const s = streak(h, checks);
  const week = h.schedule === "times_per_week" ? `${weekCount(checks, new Date())} of ${h.times_per_week} this week` : null;
  const streakText = s.count ? `${s.count} ${s.unit}${s.count === 1 ? "" : "s"} in a row` : "No streak yet";
  return (
    <View className={`flex-row items-center ${last ? "" : "border-b border-divider"}`}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${h.name}, done today`}
        accessibilityState={{ checked: done }}
        onPress={() => toggle.mutate({ habitId: h.id, date: today, done: !done })}
        className="h-slot w-slot items-center justify-center"
      >
        <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={30} color={done ? colors.accent : colors.inkMuted} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${h.name}, ${[week, streakText].filter(Boolean).join(", ")}. Open habit`}
        onPress={() => router.push({ pathname: "/habits/[id]", params: { id: h.id } })}
        className="min-h-touch min-w-0 flex-1 justify-center gap-1 py-3 pr-4 active:bg-surface-muted"
      >
        <Text numberOfLines={1} className={`font-semibold text-row-title ${done ? "text-ink-muted" : "text-ink"}`}>
          {h.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {[done ? "Done today" : null, week, streakText].filter(Boolean).join(" · ")}
        </Text>
      </Pressable>
    </View>
  );
}

export default function HabitsScreen() {
  const colors = useColors();
  const habits = useHabits();
  const now = new Date();
  const list = habits.data?.habits ?? [];
  const checksOf = (id: string) => habits.data?.checks.get(id) ?? new Set<string>();
  const dueToday = list.filter(
    (h) => isScheduled(h, now) && (h.schedule !== "times_per_week" || weekCount(checksOf(h.id), now) < (h.times_per_week ?? 1) || checksOf(h.id).has(day(now))),
  );
  const notToday = list.filter((h) => !dueToday.includes(h));

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
          Habits
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-32 pt-2">
        {habits.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : habits.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your habits. {habits.error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => habits.refetch()} />
          </View>
        ) : list.length === 0 ? (
          <View className="items-center gap-2 rounded-card border border-border bg-surface-card p-6">
            <Ionicons name="repeat-outline" size={28} color={colors.accent} />
            <Text className="text-center font-sans text-body text-ink-muted">
              Add a habit, like reading or posting a video. Tick it each day and build a streak.
            </Text>
          </View>
        ) : (
          <>
            <View className="gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Today
              </Text>
              <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                {dueToday.length === 0 ? (
                  <Text className="px-4 py-3 font-sans text-caption text-ink-muted">Nothing due today.</Text>
                ) : (
                  dueToday.map((h, i) => (
                    <HabitRow key={h.id} h={h} checks={checksOf(h.id)} last={i === dueToday.length - 1} />
                  ))
                )}
              </View>
            </View>
            {notToday.length > 0 ? (
              <View className="gap-2">
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  Not today
                </Text>
                <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                  {notToday.map((h, i) => (
                    <Pressable
                      key={h.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${h.name}, ${scheduleText(h)}. Open habit`}
                      onPress={() => router.push({ pathname: "/habits/[id]", params: { id: h.id } })}
                      className={`min-h-touch justify-center gap-1 px-4 py-3 active:bg-surface-muted ${i === notToday.length - 1 ? "" : "border-b border-divider"}`}
                    >
                      <Text className="font-semibold text-row-title text-ink">{h.name}</Text>
                      <Text className="font-sans text-caption text-ink-muted">{scheduleText(h)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Fab label="Add habit" onPress={() => router.push("/habits/new")} />
    </SafeAreaView>
  );
}
