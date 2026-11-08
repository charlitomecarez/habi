import { Ionicons } from "@expo/vector-icons";
import { addMonths, format, isAfter, isSameMonth, parseISO, startOfDay } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import {
  day,
  isScheduled,
  scheduleText,
  streak,
  timeLabel,
  useArchiveHabit,
  useDeleteHabit,
  useHabits,
  useToggleCheck,
  weekCount,
} from "@/lib/habits";

export default function HabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const habits = useHabits();
  const toggle = useToggleCheck();
  const archive = useArchiveHabit();
  const remove = useDeleteHabit();
  const now = new Date();
  const [month, setMonth] = useState(now);
  const [confirm, setConfirm] = useState<"delete" | null>(null);

  const h = habits.data?.habits.find((x) => x.id === id);
  if (!h) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
        {habits.isPending ? (
          <View className="w-full flex-1 self-stretch pt-4">
            <Skeleton layout="detail" />
          </View>
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{habits.error ? habits.error.message : "This habit was archived or deleted."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={goBack} />
          </View>
        )}
      </SafeAreaView>
    );
  }
  const checks = habits.data?.checks.get(h.id) ?? new Set<string>();
  const s = streak(h, checks);
  const today = startOfDay(now);
  const monthChecks = [...checks].filter((d) => isSameMonth(parseISO(d), month)).length;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="daily">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="min-w-0 flex-1 font-bold text-title text-on-shell"
        >
          {h.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit habit"
          onPress={() => router.push({ pathname: "/habits/edit/[id]", params: { id: h.id } })}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.onShell} />
        </Pressable>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        {(toggle.error ?? archive.error ?? remove.error) ? (
          <Notice tone="danger">{(toggle.error ?? archive.error ?? remove.error)!.message}</Notice>
        ) : null}

        <View className="flex-row gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-sans text-caption text-ink-muted">Streak</Text>
            <Text className="font-bold text-title text-ink">
              {s.count} {s.unit}
              {s.count === 1 ? "" : "s"}
            </Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="font-sans text-caption text-ink-muted">
              {h.schedule === "times_per_week" ? "This week" : `In ${format(month, "MMMM")}`}
            </Text>
            <Text className="font-bold text-title text-ink">
              {h.schedule === "times_per_week"
                ? `${weekCount(checks, now)} of ${h.times_per_week}`
                : `${monthChecks} done`}
            </Text>
          </View>
        </View>
        <Text className="font-sans text-caption text-ink-muted">
          {scheduleText(h)} · {timeLabel(h.remind_time)}
        </Text>

        <View>
          <MonthCalendar
            month={month}
            onPrevious={() => setMonth(addMonths(month, -1))}
            onNext={() => setMonth(addMonths(month, 1))}
            canGoNext={!isSameMonth(month, now)}
            selected={null}
            onSelect={(date) => {
              if (isAfter(parseISO(date), today)) return;
              toggle.mutate({ habitId: h.id, date, done: !checks.has(date) });
            }}
            describeDay={(date) => {
              if (isAfter(parseISO(date), today)) return "not yet";
              if (checks.has(date)) return "done, tap to undo";
              return isScheduled(h, parseISO(date)) ? "missed, tap to mark done" : "not scheduled";
            }}
            renderDay={(date) => {
              const d = parseISO(date);
              if (isAfter(d, today)) return null;
              if (checks.has(date)) return <Ionicons name="checkmark-circle" size={18} color={colors.accent} />;
              if (
                date !== day(now) &&
                isScheduled(h, d) &&
                h.schedule !== "times_per_week" &&
                d >= startOfDay(new Date(h.created_at))
              )
                return <Text className="font-medium text-tab-label text-ink-muted">Missed</Text>;
              return null;
            }}
          />
        </View>
        <Text className="font-sans text-caption text-ink-muted">Tap a past day to mark it done or undo it.</Text>

        <Button
          label="Archive habit"
          variant="secondary"
          size="input"
          loading={archive.isPending}
          onPress={async () => {
            await archive.mutateAsync(h.id);
            goBack();
          }}
        />
        {confirm === "delete" ? (
          <View className="gap-3 rounded-card border border-danger bg-danger-tint p-4">
            <Text className="font-sans text-body text-danger">
              Delete this habit and its history? Archive keeps the history.
            </Text>
            <Button
              label="Delete habit"
              variant="destructive"
              size="input"
              loading={remove.isPending}
              onPress={async () => {
                await remove.mutateAsync(h.id);
                goBack();
              }}
            />
            <Button label="Keep habit" variant="secondary" size="input" onPress={() => setConfirm(null)} />
          </View>
        ) : (
          <Button label="Delete habit" variant="destructive" size="input" onPress={() => setConfirm("delete")} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
