import { Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import type { BudgetMonth } from "@/lib/budgets";
import { formatPeso } from "@/lib/money";

/** "Food · ₱2,100 left of ₱8,000" with a bar. Over budget says "Over", never colour alone. */
export function BudgetRow({ b, name, last }: { b: BudgetMonth; name: string; last: boolean }) {
  const used = b.available > 0 ? Math.min(1, b.spent / b.available) : 1;
  const over = b.left < 0;
  const warn = !over && used >= 0.8;
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${over ? `over by ${formatPeso(-b.left)}` : `${formatPeso(b.left)} left`} of ${formatPeso(b.available)}${b.carried > 0 ? `, includes ${formatPeso(b.carried)} carried over` : ""}`}
      className={`gap-2 px-4 py-3 ${last ? "" : "border-b border-divider"}`}
    >
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-row-title text-ink">
          {name}
        </Text>
        {over ? <Badge label="Over" tone="danger" /> : warn ? <Badge label="80% used" tone="warning" /> : null}
      </View>
      <Text className="font-sans text-caption text-ink">
        {over ? `Over by ${formatPeso(-b.left)}` : `${formatPeso(b.left)} left`} of {formatPeso(b.available)}
      </Text>
      <View className="h-bar overflow-hidden rounded-pill bg-divider">
        <View
          className={`h-bar rounded-pill ${over ? "bg-danger" : warn ? "bg-warning" : "bg-accent"}`}
          style={{ width: `${used * 100}%` }}
        />
      </View>
      {b.carried > 0 ? (
        <Text className="font-sans text-caption text-ink-muted">
          Includes {formatPeso(b.carried)} carried over{b.carriedFrom ? ` from ${b.carriedFrom}` : ""}
        </Text>
      ) : null}
    </View>
  );
}
