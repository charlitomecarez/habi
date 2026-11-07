import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { formatPeso, type Transaction } from "@/lib/money";
import { isAutoRow } from "@/lib/recurring";

type TransactionRowProps = {
  transaction: Transaction;
  accountName: (id: string | null) => string;
  categoryName: (id: string | null) => string | undefined;
  last: boolean;
};

/** One transaction. Tapping it opens the edit form. */
export function TransactionRow({ transaction: t, accountName, categoryName, last }: TransactionRowProps) {
  const transfer = t.kind === "transfer";
  const title = transfer
    ? "Transfer"
    : (t.merchant ?? categoryName(t.category_id) ?? (t.kind === "income" ? "Income" : "Expense"));
  const where = transfer ? `${accountName(t.account_id)} → ${accountName(t.to_account_id)}` : accountName(t.account_id);
  const category = !transfer && t.merchant ? categoryName(t.category_id) : undefined;
  const sign = t.kind === "expense" ? "−" : t.kind === "income" ? "+" : "";
  const date = format(parseISO(t.occurred_on), "MMM d");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${t.kind}, ${formatPeso(t.amount)}, ${where}, ${date}`}
      onPress={() => router.push({ pathname: "/money/transaction/[id]", params: { id: t.id } })}
      className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${last ? "" : "border-b border-divider"}`}
    >
      <BrandIcon name={title} />
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
          {title}
        </Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {[category, where, date].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className={`font-semibold text-label ${t.kind === "income" ? "text-accent-strong" : "text-ink"}`}>
          {sign}
          {formatPeso(t.amount)}
        </Text>
        {isAutoRow(t.external_ref) ? <Badge label="Auto" tone="neutral" /> : null}
      </View>
    </Pressable>
  );
}
