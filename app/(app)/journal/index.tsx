import { addMonths, format, isSameMonth, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { moodLabel, useJournal } from "@/lib/journal";

export default function JournalScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  const journal = useJournal();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const [month, setMonth] = useState(now);
  const entries = journal.data ?? [];
  const byDate = new Map(entries.map((e) => [e.on_date, e]));
  const todays = byDate.get(today);
  const recent = entries.filter((e) => isSameMonth(parseISO(e.on_date), month));
  const openEntry = (date: string) => router.push({ pathname: "/journal/entry/[date]", params: { date } });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader scrollY={scrollY} title="Journal" tone="daily" />

      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        {journal.isPending ? (
          <Skeleton />
        ) : journal.error ? (
          <View className="gap-3">
            <ErrorNotice lead="Could not load your journal." error={journal.error} />
            <Button label="Try again" variant="secondary" size="input" onPress={() => journal.refetch()} />
          </View>
        ) : (
          <>
            <View className="gap-3">
              <Text className="font-medium text-caption text-ink-muted">{format(now, "EEEE, MMMM d")}</Text>
              {todays ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Read today's entry"
                  onPress={() => openEntry(today)}
                  className="gap-3 active:bg-surface-muted"
                >
                  {moodLabel(todays.mood) ? (
                    <Text className="font-semibold text-heading text-ink">
                      Feeling {moodLabel(todays.mood)?.toLowerCase()}
                    </Text>
                  ) : null}
                  <Text numberOfLines={4} className="font-sans text-body text-ink">
                    {todays.body || "No words yet."}
                  </Text>
                </Pressable>
              ) : (
                <Text className="font-sans text-body text-ink-muted">How was today? A few lines is enough.</Text>
              )}
              <Button
                label={todays ? "Edit today's entry" : "Write today's entry"}
                onPress={() => router.push({ pathname: "/journal/[date]", params: { date: today } })}
              />
            </View>

            <View>
              <MonthCalendar
                month={month}
                onPrevious={() => setMonth(addMonths(month, -1))}
                onNext={() => setMonth(addMonths(month, 1))}
                canGoNext={!isSameMonth(month, now)}
                selected={null}
                onSelect={(date) => {
                  if (date > today) return;
                  if (byDate.has(date)) openEntry(date);
                  else router.push({ pathname: "/journal/[date]", params: { date } });
                }}
                describeDay={(date) => {
                  const e = byDate.get(date);
                  return e
                    ? `entry${moodLabel(e.mood) ? `, ${moodLabel(e.mood)}` : ""}`
                    : date > today
                      ? undefined
                      : "no entry";
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
              <View>
                {recent.length === 0 ? (
                  <Text className="py-3 font-sans text-caption text-ink-muted">No entries this month.</Text>
                ) : (
                  recent.map((e, i) => (
                    <Pressable
                      key={e.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${format(parseISO(e.on_date), "MMMM d")}${moodLabel(e.mood) ? `, ${moodLabel(e.mood)}` : ""}. Open entry`}
                      onPress={() => openEntry(e.on_date)}
                      className={`min-h-touch gap-1 py-3 active:bg-surface-muted ${i === recent.length - 1 ? "" : "border-b-2 border-border"}`}
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
