import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import type { GoalProgress } from "@/lib/goals";
import { formatPeso } from "@/lib/money";

export function GoalCard({ g, last }: { g: GoalProgress; last: boolean }) {
  const pct = Math.min(100, Math.round((g.saved / g.target_amount) * 100));
  const plan = g.reached
    ? null
    : g.perMonth !== null
      ? `Save ${formatPeso(g.perMonth)} a month to reach it by ${format(parseISO(g.target_date!), "MMM yyyy")}`
      : `${formatPeso(g.left)} to go`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${g.name}, ${formatPeso(g.saved)} of ${formatPeso(g.target_amount)}${g.reached ? ", reached" : `, ${plan}`}. Open goal`}
      onPress={() => router.push({ pathname: "/money/goal/[id]", params: { id: g.id } })}
      className={`gap-2 px-4 py-3 active:bg-surface-muted ${last ? "" : "border-b border-divider"}`}
    >
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-row-title text-ink">
          {g.name}
        </Text>
        {g.reached ? (
          <Badge label="Reached" tone="neutral" />
        ) : (
          <Text className="font-medium text-caption text-ink-muted">{pct}%</Text>
        )}
      </View>
      <Text className="font-sans text-caption text-ink">
        {formatPeso(g.saved)} of {formatPeso(g.target_amount)}
      </Text>
      <View className="h-bar overflow-hidden rounded-pill bg-divider">
        <View className="h-bar rounded-pill bg-accent" style={{ width: `${pct}%` }} />
      </View>
      {plan ? <Text className="font-sans text-caption text-ink-muted">{plan}</Text> : null}
    </Pressable>
  );
}
