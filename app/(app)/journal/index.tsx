import { Ionicons } from "@expo/vector-icons";
import { addMonths, format, isSameMonth, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { moodLabel, useJournal } from "@/lib/journal";

export default function JournalScreen() {
  const colors = useColors();
  const journal = useJournal();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const [month, setMonth] = useState(now);
  const entries = journal.data ?? [];
  const byDate = new Map(entries.map((e) => [e.on_date, e]));
  const todays = byDate.get(today);
  const recent = entries.filter((e) => isSameMonth(parseISO(e.on_date), month));

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
          Journal
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-2">
        {journal.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : journal.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your journal. {journal.error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => journal.refetch()} />
          </View>
        ) : (
          <>
            <View className="gap-3 rounded-card border border-border bg-surface-card p-4">
              <Text className="font-medium text-caption text-ink-muted">{format(now, "EEEE, MMMM d")}</Text>
              {todays ? (
                <>
                  {moodLabel(todays.mood) ? (
                    <Text className="font-semibold text-heading text-ink">Feeling {moodLabel(todays.mood)?.toLowerCase()}</Text>
                  ) : null}
                  <Text numberOfLines={4} className="font-sans text-body text-ink">
                    {todays.body || "No words yet."}
                  </Text>
                </>
              ) : (
                <Text className="font-sans text-body text-ink-muted">How was today? A few lines is enough.</Text>
              )}
              <Button
                label={todays ? "Edit today's entry" : "Write today's entry"}
                onPress={() => router.push({ pathname: "/journal/[date]", params: { date: today } })}
              />
            </View>

            <View className="rounded-card border border-border bg-surface-card px-2 py-3">
              <MonthCalendar
                month={month}
                onPrevious={() => setMonth(addMonths(month, -1))}
                onNext={() => setMonth(addMonths(month, 1))}
                canGoNext={!isSameMonth(month, now)}
                selected={null}
                onSelect={(date) => {
                  if (date > today) return;
                  router.push({ pathname: "/journal/[date]", params: { date } });
                }}
                describeDay={(date) => {
                  const e = byDate.get(date);
                  return e ? `entry${moodLabel(e.mood) ? `, ${moodLabel(e.mood)}` : ""}` : date > today ? undefined : "no entry";
                }}
                renderDay={(date) => {
                  const e = byDate.get(date);
                  if (!e) return null;
                  return (
                    <Text numberOfLines={1} className="font-medium text-tab-label text-accent-strong">
                      {moodLabel(e.mood) ?? "Entry"}
                    </Text>
                  );
                }}
              />
            </View>

            <View className="gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                {format(month, "MMMM")} · {recent.length} {recent.length === 1 ? "entry" : "entries"}
              </Text>
              <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                {recent.length === 0 ? (
                  <Text className="px-4 py-3 font-sans text-caption text-ink-muted">No entries this month.</Text>
                ) : (
                  recent.map((e, i) => (
                    <Pressable
                      key={e.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${format(parseISO(e.on_date), "MMMM d")}${moodLabel(e.mood) ? `, ${moodLabel(e.mood)}` : ""}. Open entry`}
                      onPress={() => router.push({ pathname: "/journal/[date]", params: { date: e.on_date } })}
                      className={`min-h-touch gap-1 px-4 py-3 active:bg-surface-muted ${i === recent.length - 1 ? "" : "border-b border-divider"}`}
                    >
                      <Text className="font-semibold text-row-title text-ink">
                        {format(parseISO(e.on_date), "EEE, MMM d")}
                        {moodLabel(e.mood) ? ` · ${moodLabel(e.mood)}` : ""}
                      </Text>
                      <Text numberOfLines={2} className="font-sans text-caption text-ink-muted">
                        {e.body || "No words"}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
