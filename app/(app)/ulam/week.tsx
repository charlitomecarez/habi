import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MealSheet } from "@/components/ulam/MealSheet";
import { UlamHeader } from "@/components/ulam/UlamHeader";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import { formatPeso } from "@/lib/money";
import { useUlamDays, weekRows, weekSummary } from "@/lib/ulam";

export default function UlamWeekScreen() {
  const days = useUlamDays();
  const [adding, setAdding] = useState<string | null>(null);
  const rows = weekRows(days.data ?? []);
  const summary = weekSummary(rows);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <UlamHeader title="Last 7 days" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-3">
        {days.error ? <Notice tone="danger">Could not load your ulam. {days.error.message}</Notice> : null}
        <View className="gap-1 rounded-card border border-border bg-surface-card p-4">
          <View className="flex-row justify-between gap-3">
            <Text className="font-semibold text-heading text-ink">{formatPeso(summary.spent)} spent</Text>
            <Text className="font-sans text-caption text-ink-muted">{summary.logged} of 7 days</Text>
          </View>
          {summary.averageKcalWithRice !== null ? (
            <Text className="font-sans text-caption text-ink-muted">
              About {summary.averageKcalWithRice} kcal a meal, with 1 cup rice
            </Text>
          ) : null}
        </View>

        <View className="overflow-hidden rounded-card border border-border bg-surface-card">
          {rows.map((row, index) => (
            <View
              key={row.date}
              className={`min-h-touch flex-row items-center gap-3 px-4 py-2 ${index === rows.length - 1 ? "" : "border-b border-divider"}`}
            >
              <Text className="w-8 font-sans text-caption text-ink-muted">{row.day}</Text>
              <Text
                numberOfLines={1}
                className={`flex-1 text-label ${row.name ? "font-medium text-ink" : "font-sans text-ink-muted"}`}
              >
                {row.name ?? "Not logged"}
              </Text>
              {row.isToday && !row.eaten ? <Badge label="Today" tone="neutral" /> : null}
              {row.eaten && row.cost !== null ? (
                <Text className="font-sans text-label text-ink">{formatPeso(row.cost)}</Text>
              ) : null}
              {!row.eaten && !row.isToday ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add a meal for ${row.day}`}
                  onPress={() => setAdding(row.date)}
                  className="h-touch justify-center px-2"
                >
                  <Text className="font-semibold text-label text-accent">Add</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
      <MealSheet date={adding} onClose={() => setAdding(null)} />
    </SafeAreaView>
  );
}
