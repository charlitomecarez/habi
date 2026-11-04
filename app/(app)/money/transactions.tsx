import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TransactionRow } from "@/components/money/TransactionRow";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useAccounts, useCategories, useTransactions, type Transaction } from "@/lib/money";

/** Groups transactions by month, keeping the newest-first order. */
function byMonth(transactions: Transaction[]): { month: string; rows: Transaction[] }[] {
  const groups: { month: string; rows: Transaction[] }[] = [];
  for (const t of transactions) {
    const month = format(parseISO(t.occurred_on), "MMMM yyyy");
    const last = groups[groups.length - 1];
    if (last?.month === month) last.rows.push(t);
    else groups.push({ month, rows: [t] });
  }
  return groups;
}

export default function TransactionsScreen() {
  const colors = useColors();
  const transactions = useTransactions("history");
  const accounts = useAccounts();
  const categories = useCategories();

  const accountName = (id: string | null) => accounts.data?.find((a) => a.id === id)?.name ?? "Unknown account";
  const categoryName = (id: string | null) => categories.data?.find((c) => c.id === id)?.name;
  const error = transactions.error ?? accounts.error ?? categories.error;

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
          Transactions
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-32 pt-2">
        {transactions.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load transactions. {error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => transactions.refetch()} />
          </View>
        ) : transactions.data?.length === 0 ? (
          <View className="items-center rounded-card border border-border bg-surface-card p-6">
            <Text className="text-center font-sans text-body text-ink-muted">No transactions yet.</Text>
          </View>
        ) : (
          byMonth(transactions.data ?? []).map((group) => (
            <View key={group.month} className="gap-3">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                {group.month}
              </Text>
              <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                {group.rows.map((t, index) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    accountName={accountName}
                    categoryName={categoryName}
                    last={index === group.rows.length - 1}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Add expense" onPress={() => router.push("/money/transaction/new")} />
    </SafeAreaView>
  );
}
