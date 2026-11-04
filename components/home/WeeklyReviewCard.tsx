import { format, parseISO } from "date-fns";
import { ActivityIndicator, Text, View } from "react-native";

import { useColors } from "@/lib/colors";
import { showWeeklyReview, useWeeklyReview } from "@/lib/weekly";

/** Sunday's look back at the week: money, todos, vehicle, videos, habits and gym. */
export function WeeklyReviewCard() {
  const colors = useColors();
  const show = showWeeklyReview();
  const review = useWeeklyReview(show);
  if (!show) return null;

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        Your week
        {review.data
          ? ` · ${format(parseISO(review.data.review.week_start), "MMM d")} to ${format(parseISO(review.data.review.week_end), "MMM d")}`
          : ""}
      </Text>
      <View className="gap-4 rounded-card border border-border bg-surface-card p-4">
        {review.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : review.error ? (
          <Text className="font-sans text-caption text-danger">Could not load the week. {review.error.message}</Text>
        ) : (
          review.data?.sections.map((s) => (
            <View key={s.heading} className="gap-1">
              <Text className="font-semibold text-caption uppercase tracking-wide text-ink-muted">{s.heading}</Text>
              {s.lines.map((l) => (
                <Text key={l} className="font-sans text-body text-ink">
                  {l}
                </Text>
              ))}
            </View>
          ))
        )}
        <Text className="font-sans text-caption text-ink-muted">The same review comes by email today.</Text>
      </View>
    </View>
  );
}
