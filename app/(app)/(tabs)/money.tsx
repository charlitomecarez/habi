import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountSheet } from "@/components/money/AccountSheet";
import { SpendingCalendar } from "@/components/money/SpendingCalendar";
import { TransactionRow } from "@/components/money/TransactionRow";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import {
  daysUntil,
  formatMoney,
  formatPeso,
  RENEWAL_LIST_DAYS,
  renewalText,
  useAccounts,
  useCategories,
  useMonthSummary,
  useSubscriptions,
  useTransactions,
  type Account,
  type Subscription,
} from "@/lib/money";

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="min-h-touch flex-row items-center justify-between">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        {title}
      </Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} className="h-touch justify-center pl-3">
          <Text className="font-semibold text-label text-accent">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function RenewalRow({ s, accountName, last }: { s: Subscription; accountName: string | undefined; last: boolean }) {
  const renewal = renewalText(s.next_billing_on);
  const date = format(parseISO(s.next_billing_on), "MMM d");
  const days = daysUntil(s.next_billing_on);
  const caption =
    renewal.status === "overdue"
      ? `Overdue · ${date}, not logged`
      : renewal.status === "today"
        ? "Renews today"
        : renewal.status === "soon"
          ? `${date} · in ${days} ${days === 1 ? "day" : "days"}`
          : [date, accountName].filter(Boolean).join(" · ");
  const captionClass =
    renewal.status === "overdue"
      ? "font-medium text-danger"
      : renewal.status === "later"
        ? "font-sans text-ink-muted"
        : "font-medium text-warning";
  const inPesos = s.currency !== "PHP" && s.rateToPhp !== null ? s.amount * s.rateToPhp : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${s.name}, ${formatMoney(s.amount, s.currency)}, ${caption}`}
      onPress={() => router.push({ pathname: "/money/subscription/[id]", params: { id: s.id } })}
      className={`min-h-touch flex-row items-center justify-between gap-3 px-4 py-3 active:bg-surface-muted ${last ? "" : "border-b border-divider"}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
          {s.name}
        </Text>
        <Text numberOfLines={1} className={`text-caption ${captionClass}`}>
          {caption}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-semibold text-row-title text-ink">{formatMoney(s.amount, s.currency)}</Text>
        {inPesos !== null ? (
          <Text className="font-sans text-badge text-ink-muted">≈ {formatPeso(Math.round(inPesos))}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function MoneyScreen() {
  const colors = useColors();
  const [editing, setEditing] = useState<Account | null>(null);
  const now = new Date();
  const accounts = useAccounts();
  const categories = useCategories();
  const month = useMonthSummary(now);
  const subscriptions = useSubscriptions();
  const recent = useTransactions("recent");

  const accountList = accounts.data ?? [];
  const total = accountList.filter((a) => a.currency === "PHP").reduce((sum, a) => sum + a.balance, 0);
  const accountName = (id: string | null) => accountList.find((a) => a.id === id)?.name ?? "Unknown account";
  const categoryName = (id: string | null) => categories.data?.find((c) => c.id === id)?.name;

  const spending = month.data?.byCategory ?? [];
  const largest = spending[0]?.total ?? 0;
  const renewing = (subscriptions.data ?? []).filter((s) => daysUntil(s.next_billing_on, now) <= RENEWAL_LIST_DAYS);

  const error = accounts.error ?? month.error ?? recent.error ?? subscriptions.error ?? categories.error;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-32 pt-6">
        {accounts.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your money. {error.message}</Notice>
            <Button
              label="Try again"
              variant="secondary"
              size="input"
              onPress={() => {
                accounts.refetch();
                categories.refetch();
                month.refetch();
                subscriptions.refetch();
                recent.refetch();
              }}
            />
          </View>
        ) : (
          <>
            <View className="gap-3 rounded-hero bg-accent p-5">
              <View className="flex-row items-center justify-between">
                <Text className="font-medium text-label text-on-accent/90">Total balance</Text>
                <Text className="font-medium text-caption text-on-accent/90">{format(now, "MMMM")}</Text>
              </View>
              <Text accessibilityRole="header" className="font-bold text-display text-on-accent">
                {formatPeso(total)}
              </Text>
              <View className="flex-row gap-5">
                <View className="gap-1">
                  <Text className="font-sans text-caption text-on-accent/90">Spent this month</Text>
                  <Text className="font-semibold text-row-title text-on-accent">
                    {formatPeso(month.data?.spent ?? 0)}
                  </Text>
                </View>
                <View className="gap-1">
                  <Text className="font-sans text-caption text-on-accent/90">Income</Text>
                  <Text className="font-semibold text-row-title text-on-accent">
                    {formatPeso(month.data?.income ?? 0)}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {accountList.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.name}, balance ${formatMoney(a.balance, a.currency)}. Edit account`}
                  onPress={() => setEditing(a)}
                  className="min-h-touch min-w-0 grow basis-[45%] gap-1 rounded-input border border-border bg-surface-card px-4 py-3 active:bg-surface-muted"
                >
                  <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
                    {a.name}
                  </Text>
                  <Text numberOfLines={1} className="font-bold text-heading text-ink">
                    {formatMoney(a.balance, a.currency)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <SpendingCalendar accountName={accountName} categoryName={categoryName} />

            <View className="gap-3">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Spending by category
              </Text>
              <View className="gap-3 rounded-card border border-border bg-surface-card p-4">
                {spending.length === 0 ? (
                  <Text className="font-sans text-caption text-ink-muted">No spending logged this month.</Text>
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

            <View className="gap-2">
              <SectionHeader
                title="Renewing soon"
                action="All subscriptions"
                onAction={() => router.push("/money/subscriptions")}
              />
              <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                {renewing.length === 0 ? (
                  <Text className="px-4 py-3 font-sans text-caption text-ink-muted">
                    Nothing renews in the next {RENEWAL_LIST_DAYS} days.
                  </Text>
                ) : (
                  renewing.map((s, index) => (
                    <RenewalRow
                      key={s.id}
                      s={s}
                      accountName={s.account_id ? accountName(s.account_id) : undefined}
                      last={index === renewing.length - 1}
                    />
                  ))
                )}
              </View>
            </View>

            <View className="gap-2">
              <SectionHeader title="Recent" action="See all" onAction={() => router.push("/money/transactions")} />
              <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                {(recent.data ?? []).length === 0 ? (
                  <View className="items-center gap-2 p-6">
                    <Ionicons name="wallet-outline" size={28} color={colors.accent} />
                    <Text className="text-center font-sans text-body text-ink-muted">
                      Set each account&apos;s opening balance, then log what you spend and earn.
                    </Text>
                  </View>
                ) : (
                  recent.data?.map((t, index) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      accountName={accountName}
                      categoryName={categoryName}
                      last={index === (recent.data?.length ?? 0) - 1}
                    />
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Fab label="Add expense" onPress={() => router.push("/money/transaction/new")} />

      <AccountSheet visible={editing !== null} onClose={() => setEditing(null)} account={editing} />
    </SafeAreaView>
  );
}
