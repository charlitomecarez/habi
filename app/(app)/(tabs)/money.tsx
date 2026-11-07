import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountSheet } from "@/components/money/AccountSheet";
import { CategorySpending } from "@/components/money/CategorySpending";
import { GoalCard } from "@/components/money/GoalCard";
import { SpendingCalendar } from "@/components/money/SpendingCalendar";
import { TransactionRow } from "@/components/money/TransactionRow";
import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { DataRow, type RowStatus } from "@/components/ui/DataRow";
import { Fab } from "@/components/ui/Fab";
import { TabField } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { useBudgetMonths } from "@/lib/budgets";
import { useColors } from "@/lib/colors";
import { useGoals } from "@/lib/goals";
import { isAutoRow, monthlyAmount, useRecurring } from "@/lib/recurring";
import { todayIndex, weekDays } from "@/lib/week";
import {
  dayTotals,
  daysUntil,
  formatMoney,
  formatPeso,
  RENEWAL_LIST_DAYS,
  renewalText,
  toDateString,
  useAccounts,
  useCategories,
  useMonthSummary,
  useMonthTransactions,
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
  const inPesos = s.currency !== "PHP" && s.rateToPhp !== null && s.amount !== null ? s.amount * s.rateToPhp : null;
  const detail =
    renewal.status === "soon"
      ? `${date} · in ${days} ${days === 1 ? "day" : "days"}`
      : [date, accountName, inPesos !== null ? `≈ ${formatPeso(Math.round(inPesos))}` : undefined]
          .filter(Boolean)
          .join(" · ");
  const status: RowStatus | undefined =
    renewal.status === "overdue"
      ? { label: "Overdue", tone: "over" }
      : renewal.status === "today"
        ? { label: "Today", tone: "over" }
        : renewal.status === "soon"
          ? { label: "Due soon", tone: "watch" }
          : undefined;

  return (
    <DataRow
      title={s.name}
      detail={detail}
      value={s.amount === null ? undefined : formatMoney(s.amount, s.currency)}
      status={status}
      onPress={() => router.push({ pathname: "/money/subscription/[id]", params: { id: s.id } })}
      last={last}
    />
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
  const budgets = useBudgetMonths(now);
  const goals = useGoals();
  const recurring = useRecurring();
  const monthRows = useMonthTransactions(now);

  const budgetList = budgets ?? [];
  const hasBudget = budgetList.length > 0;
  const moneyLeft = budgetList.reduce((sum, b) => sum + b.left, 0);
  const overBudget = budgetList.filter((b) => b.left < 0).length;
  const spentByDay = new Map([...dayTotals(monthRows.data ?? []).byDay].map(([day, t]) => [day, t.spent]));
  const week = weekDays(now);
  const todayRows = (monthRows.data ?? []).filter((t) => t.occurred_on === toDateString(now) && t.kind !== "transfer");
  const running = (recurring.data ?? []).filter((r) => !r.is_paused);
  const recurringMonthly = running.filter((r) => r.kind === "expense").reduce((sum, r) => sum + monthlyAmount(r), 0);
  const subscriptionList = (subscriptions.data ?? []).filter((x) => x.kind === "subscription");
  const subscriptionMonthly = subscriptionList.reduce((sum, x) => sum + (x.monthlyPhp ?? 0), 0);

  const accountList = accounts.data ?? [];
  const total = accountList.filter((a) => a.currency === "PHP").reduce((sum, a) => sum + a.balance, 0);
  const accountName = (id: string | null) => accountList.find((a) => a.id === id)?.name ?? "Unknown account";
  const categoryName = (id: string | null) => categories.data?.find((c) => c.id === id)?.name;

  const renewing = (subscriptions.data ?? []).filter((s) => daysUntil(s.next_billing_on, now) <= RENEWAL_LIST_DAYS);

  const error = accounts.error ?? month.error ?? recent.error ?? subscriptions.error ?? categories.error;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <TabField
        lead={hasBudget ? `${formatPeso(moneyLeft)} left` : formatPeso(total)}
        detail={
          hasBudget
            ? `This month, from your budgets · ${formatPeso(month.data?.spent ?? 0)} spent`
            : `Total balance · ${formatPeso(month.data?.spent ?? 0)} spent this month`
        }
      />
      <ScrollView contentContainerClassName="gap-5 px-5 pb-fab-clear pt-4">
        {accounts.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your money. Check your connection.</Notice>
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
            <BarChart
              label={`Spending this week. Today ${formatPeso(spentByDay.get(toDateString(now)) ?? 0)}.`}
              values={week.map((d) => spentByDay.get(toDateString(d)) ?? 0)}
              labels={week.map((d) => format(d, "EEEEE"))}
              highlight={todayIndex(now)}
            />

            <View>
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Today
              </Text>
              {todayRows.length === 0 ? (
                <Text className="py-3 font-sans text-caption text-ink-muted">Nothing logged today.</Text>
              ) : (
                todayRows.map((t, index) => (
                  <DataRow
                    key={t.id}
                    title={t.merchant ?? categoryName(t.category_id) ?? (t.kind === "income" ? "Income" : "Expense")}
                    detail={accountName(t.account_id)}
                    value={formatPeso(t.amount)}
                    status={isAutoRow(t.external_ref) ? { label: "Auto", tone: "muted" } : undefined}
                    onPress={() => router.push({ pathname: "/money/transaction/[id]", params: { id: t.id } })}
                    last={index === todayRows.length - 1}
                  />
                ))
              )}
            </View>

            <View>
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                This month
              </Text>
              <DataRow
                title="Budgets"
                detail={
                  budgets?.length ? `${budgets.length} ${budgets.length === 1 ? "budget" : "budgets"}` : "Set a limit"
                }
                status={overBudget > 0 ? { label: `${overBudget} over`, tone: "over" } : undefined}
                onPress={() => router.push("/money/budgets")}
              />
              <DataRow
                title="Recurring"
                detail={`${running.length} running`}
                value={running.length > 0 ? formatPeso(recurringMonthly) : undefined}
                onPress={() => router.push("/money/recurring")}
              />
              <DataRow
                title="Subscriptions"
                detail={`${subscriptionList.length} active`}
                value={subscriptionList.length > 0 ? formatPeso(subscriptionMonthly) : undefined}
                onPress={() => router.push("/money/subscriptions")}
              />
              <DataRow title="Bills" onPress={() => router.push("/money/bills")} />
              <DataRow title="Income" value={formatPeso(month.data?.income ?? 0)} />
              <DataRow title="Import statement" onPress={() => router.push("/money/import")} last />
            </View>

            <View>
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Accounts
              </Text>
              <DataRow title="Total balance" value={formatPeso(total)} />
              {accountList.map((a, index) => (
                <DataRow
                  key={a.id}
                  title={a.name}
                  value={formatMoney(a.balance, a.currency)}
                  onPress={() => setEditing(a)}
                  last={index === accountList.length - 1}
                />
              ))}
            </View>

            <SpendingCalendar accountName={accountName} categoryName={categoryName} />

            <View className="gap-2">
              <SectionHeader title="Savings goals" action="Add goal" onAction={() => router.push("/money/goal/new")} />
              <View>
                {(goals.data?.goals ?? []).length === 0 ? (
                  <Text className="py-3 font-sans text-caption text-ink-muted">
                    Set a goal, for example a new phone ₱30,000 by June.
                  </Text>
                ) : (
                  goals.data?.goals.map((g, i) => (
                    <GoalCard key={g.id} g={g} last={i === (goals.data?.goals.length ?? 0) - 1} />
                  ))
                )}
              </View>
            </View>

            <CategorySpending categoryName={categoryName} />

            <View className="gap-2">
              <SectionHeader title="Renewing and due soon" />
              <View>
                {renewing.length === 0 ? (
                  <Text className="py-3 font-sans text-caption text-ink-muted">
                    Nothing renews or is due in the next {RENEWAL_LIST_DAYS} days.
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
              <View>
                {(recent.data ?? []).length === 0 ? (
                  <View className="items-center gap-2 p-6">
                    <Ionicons name="wallet-outline" size={28} color={colors.accent} />
                    <Text className="text-center font-sans text-body text-ink-muted">
                      Set each account&apos;s balance, then log what you spend and earn.
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
