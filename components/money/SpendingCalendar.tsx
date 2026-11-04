import { addMonths, format, isSameMonth, parseISO } from "date-fns";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { TransactionRow } from "@/components/money/TransactionRow";
import { Button } from "@/components/ui/Button";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { compactAmount, dayTotals, formatPeso, toDateString, useMonthTransactions } from "@/lib/money";

type SpendingCalendarProps = {
  accountName: (id: string | null) => string;
  categoryName: (id: string | null) => string | undefined;
};

/** The month's spending and income per day. Tap a day to see its transactions. */
export function SpendingCalendar({ accountName, categoryName }: SpendingCalendarProps) {
  const colors = useColors();
  const now = new Date();
  const [month, setMonth] = useState(now);
  const [selected, setSelected] = useState<string | null>(toDateString(now));
  const transactions = useMonthTransactions(month);

  const list = transactions.data ?? [];
  const totals = dayTotals(list);
  const isThisMonth = isSameMonth(month, now);
  const dayRows = selected ? list.filter((t) => t.occurred_on === selected) : [];
  const selectedDay = selected ? totals.byDay.get(selected) : undefined;

  function changeMonth(by: number) {
    const next = addMonths(month, by);
    setMonth(next);
    setSelected(isSameMonth(next, now) ? toDateString(now) : null);
  }

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        Daily spending
      </Text>
      {/* Narrow side padding and no gaps between cells keep each day 44px wide on a 384dp phone. */}
      <View className="gap-4 rounded-card border border-border bg-surface-card px-2 py-3">
        <MonthCalendar
          month={month}
          onPrevious={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          canGoNext={!isThisMonth}
          selected={selected}
          onSelect={setSelected}
          summary={
            <Text className="font-sans text-caption text-ink-muted">
              Spent {formatPeso(totals.spent)} · Income {formatPeso(totals.income)}
            </Text>
          }
          describeDay={(date) => {
            const day = totals.byDay.get(date);
            if (!day) return "nothing logged";
            return [
              day.spent > 0 ? `spent ${formatPeso(day.spent)}` : null,
              day.income > 0 ? `income ${formatPeso(day.income)}` : null,
            ]
              .filter(Boolean)
              .join(", ");
          }}
          renderDay={(date) => {
            const day = totals.byDay.get(date);
            if (!day) return null;
            return (
              <View className="items-center">
                {day.spent > 0 ? (
                  <Text numberOfLines={1} className="font-medium text-tab-label text-ink">
                    −{compactAmount(day.spent)}
                  </Text>
                ) : null}
                {day.income > 0 ? (
                  <Text numberOfLines={1} className="font-medium text-tab-label text-accent-strong">
                    +{compactAmount(day.income)}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />

        {transactions.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load this month. {transactions.error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => transactions.refetch()} />
          </View>
        ) : transactions.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-4" />
        ) : selected ? (
          <View className="gap-2">
            <View className="flex-row items-baseline justify-between gap-3 px-1">
              <Text accessibilityRole="header" className="font-semibold text-label text-ink">
                {format(parseISO(selected), "EEEE, MMM d")}
              </Text>
              {selectedDay ? (
                <Text className="font-sans text-caption text-ink-muted">
                  {[
                    selectedDay.spent > 0 ? `Spent ${formatPeso(selectedDay.spent)}` : null,
                    selectedDay.income > 0 ? `Income ${formatPeso(selectedDay.income)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
            </View>
            {dayRows.length === 0 ? (
              <Text className="px-1 font-sans text-caption text-ink-muted">Nothing logged on this day.</Text>
            ) : (
              <View className="overflow-hidden rounded-input border border-border">
                {dayRows.map((t, index) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    accountName={accountName}
                    categoryName={categoryName}
                    last={index === dayRows.length - 1}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <Text className="px-1 font-sans text-caption text-ink-muted">
            Tap a day to see what you spent and earned.
          </Text>
        )}
      </View>
    </View>
  );
}
