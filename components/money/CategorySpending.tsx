import { Ionicons } from "@expo/vector-icons";
import { addMonths, format, isSameMonth } from "date-fns";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { useColors } from "@/lib/colors";
import { formatPeso, useMonthSummary } from "@/lib/money";

/** The expense total per category for one month. The previous and next buttons change the month. */
export function CategorySpending({ categoryName }: { categoryName: (id: string | null) => string | undefined }) {
  const colors = useColors();
  const now = new Date();
  const [month, setMonth] = useState(now);
  const summary = useMonthSummary(month);

  const spending = summary.data?.byCategory ?? [];
  const largest = spending[0]?.total ?? 0;
  const canGoNext = !isSameMonth(month, now);
  const title = format(month, "MMMM yyyy");

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        Spending by category
      </Text>
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => setMonth(addMonths(month, -1))}
            className="h-touch w-touch items-center justify-center rounded-pill active:bg-surface-muted"
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
          <View className="min-w-0 flex-1 items-center gap-1">
            <Text className="font-semibold text-label text-ink">{title}</Text>
            <Text className="font-sans text-caption text-ink-muted">Spent {formatPeso(summary.data?.spent ?? 0)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: !canGoNext }}
            disabled={!canGoNext}
            onPress={() => setMonth(addMonths(month, 1))}
            className={`h-touch w-touch items-center justify-center rounded-pill active:bg-surface-muted ${canGoNext ? "" : "opacity-40"}`}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </Pressable>
        </View>

        {summary.error ? (
          <View className="gap-3">
            <ErrorNotice lead="Could not load this month." error={summary.error} />
            <Button label="Try again" variant="secondary" size="input" onPress={() => summary.refetch()} />
          </View>
        ) : summary.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-4" />
        ) : spending.length === 0 ? (
          <Text className="font-sans text-caption text-ink-muted">No spending logged in {title}.</Text>
        ) : (
          spending.map((row) => (
            <View key={row.categoryId ?? "none"} className="gap-2">
              <View className="flex-row justify-between gap-3">
                <Text numberOfLines={1} className="flex-1 font-medium text-label text-ink">
                  {categoryName(row.categoryId) ?? "No category"}
                </Text>
                <Text className="font-semibold text-label text-ink">{formatPeso(row.total)}</Text>
              </View>
              <View className="h-bar overflow-hidden rounded-pill bg-divider">
                <View
                  className="h-bar rounded-pill bg-accent"
                  style={{ width: `${largest > 0 ? (row.total / largest) * 100 : 0}%` }}
                />
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
