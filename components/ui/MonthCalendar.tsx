import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { monthWeeks, WEEKDAYS } from "@/lib/calendar";
import { useColors } from "@/lib/colors";

type MonthCalendarProps = {
  /** Any date in the month to show. */
  month: Date;
  onPrevious: () => void;
  onNext: () => void;
  /** False hides the way to months that have nothing yet, for example after this month. */
  canGoNext: boolean;
  /** The selected day, "yyyy-MM-dd". */
  selected: string | null;
  onSelect: (date: string) => void;
  /** Extra lines under the day number, for example the day's totals. */
  renderDay?: (date: string) => ReactNode;
  /** What a screen reader says for a day, after the date. For example "spent ₱1,200.00". */
  describeDay?: (date: string) => string | undefined;
  /** Shown under the month name, for example the month totals. */
  summary?: ReactNode;
};

/** A month grid with previous and next buttons. Money, Habits, Gym and Journal use it. */
export function MonthCalendar({
  month,
  onPrevious,
  onNext,
  canGoNext,
  selected,
  onSelect,
  renderDay,
  describeDay,
  summary,
}: MonthCalendarProps) {
  const colors = useColors();
  const today = format(new Date(), "yyyy-MM-dd");
  const title = format(month, "MMMM yyyy");

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={onPrevious}
          className="h-touch w-touch items-center justify-center rounded-pill active:bg-surface-muted"
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <View className="min-w-0 flex-1 items-center gap-1">
          <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
            {title}
          </Text>
          {summary}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canGoNext }}
          disabled={!canGoNext}
          onPress={onNext}
          className={`h-touch w-touch items-center justify-center rounded-pill active:bg-surface-muted ${canGoNext ? "" : "opacity-0"}`}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View className="flex-row" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEKDAYS.map((d) => (
          <Text key={d.long} className="flex-1 text-center font-medium text-badge text-ink-muted">
            {d.short}
          </Text>
        ))}
      </View>

      <View className="gap-1">
        {monthWeeks(month).map((week, row) => (
          <View key={row} className="flex-row">
            {week.map((cell, col) => {
              if (!cell) return <View key={col} className="flex-1" />;
              const isToday = cell.date === today;
              const isSelected = cell.date === selected;
              const extra = describeDay?.(cell.date);
              const label = [format(new Date(`${cell.date}T00:00:00`), "EEEE, MMMM d"), isToday ? "today" : null, extra]
                .filter(Boolean)
                .join(", ");
              return (
                <Pressable
                  key={cell.date}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelect(cell.date)}
                  className={`min-h-slot min-w-0 flex-1 items-center gap-1 rounded-sm border py-1 ${
                    isSelected
                      ? "border-accent bg-accent-tint"
                      : isToday
                        ? "border-border-input active:bg-surface-muted"
                        : "border-transparent active:bg-surface-muted"
                  }`}
                >
                  <Text className={`text-label ${isToday ? "font-bold text-accent-strong" : "font-medium text-ink"}`}>
                    {cell.day}
                  </Text>
                  {renderDay?.(cell.date)}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
