import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { day, isScheduled, scheduleText, streak, useHabits, useToggleCheck, weekCount, type Habit } from "@/lib/habits";

function HabitRow({ h, checks, last }: { h: Habit; checks: Set<string>; last: boolean }) {
  const colors = useColors();
  const toggle = useToggleCheck();
  const today = day(new Date());
  const done = checks.has(today);
  const s = streak(h, checks);
  return (
    <View className={`flex-row items-center ${last ? "" : "border-b-2 border-border"}`}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${h.name}, done today`}
        accessibilityState={{ checked: done }}
        onPress={() => toggle.mutate({ habitId: h.id, date: today, done: !done })}
        className="-ml-3 h-touch w-touch items-center justify-center"
      >
        <Ionicons
          name={done ? "checkmark-circle" : "ellipse-outline"}
          size={26}
          color={done ? colors.accent : colors.inkMuted}
        />
      </Pressable>
      <View className="min-w-0 flex-1">
        <DataRow
          title={h.name}
          detail={s.count ? `${s.count}-${s.unit} streak` : "No streak yet"}
          value={h.schedule === "times_per_week" ? `${weekCount(checks, new Date())} / ${h.times_per_week}` : undefined}
          status={done ? { label: "Done", tone: "good" } : { label: "Today", tone: "muted" }}
          onPress={() => router.push({ pathname: "/habits/[id]", params: { id: h.id } })}
          last
        />
      </View>
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
    (h) =>
      isScheduled(h, now) &&
      (h.schedule !== "times_per_week" ||
        weekCount(checksOf(h.id), now) < (h.times_per_week ?? 1) ||
        checksOf(h.id).has(day(now))),
  );
  const notToday = list.filter((h) => !dueToday.includes(h));
  const doneToday = dueToday.filter((h) => checksOf(h.id).has(day(now))).length;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title="Habits"
        tone="daily"
        subtitle={list.length > 0 ? `${doneToday} of ${dueToday.length} done today` : undefined}
      />

      <ScrollView contentContainerClassName="gap-5 px-5 pb-fab-clear pt-3">
        {habits.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : habits.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your habits. {habits.error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => habits.refetch()} />
          </View>
        ) : list.length === 0 ? (
          <Text className="py-4 font-sans text-body text-ink-muted">
            I keep your streaks here. Add a habit, like reading or posting a video, and tick it each day.
          </Text>
        ) : (
          <>
            <View>
              {dueToday.length === 0 ? (
                <Text className="py-3 font-sans text-caption text-ink-muted">Nothing due today.</Text>
              ) : (
                dueToday.map((h, i) => (
                  <HabitRow key={h.id} h={h} checks={checksOf(h.id)} last={i === dueToday.length - 1} />
                ))
              )}
            </View>
            {notToday.length > 0 ? (
              <View>
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  Not today
                </Text>
                {notToday.map((h, i) => (
                  <DataRow
                    key={h.id}
                    title={h.name}
                    detail={scheduleText(h)}
                    onPress={() => router.push({ pathname: "/habits/[id]", params: { id: h.id } })}
                    last={i === notToday.length - 1}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Fab label="Add habit" onPress={() => router.push("/habits/new")} />
    </SafeAreaView>
  );
}
