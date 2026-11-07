import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { formatPeso, useAccounts } from "@/lib/money";
import { monthlyAmount, nextDate, nextText, scheduleText, useRecurring, type Recurring } from "@/lib/recurring";

function RecurringRow({ rule, accountName, last }: { rule: Recurring; accountName?: string; last: boolean }) {
  const income = rule.kind === "income";
  const detail = [scheduleText(rule), income ? "Income" : accountName, rule.is_paused ? "Paused" : null]
    .filter(Boolean)
    .join(" · ");
  const next = rule.is_paused ? "Paused" : nextText(nextDate(rule, new Date()), new Date());
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rule.name}, ${formatPeso(rule.amount)}, ${detail}, ${next}`}
      onPress={() => router.push({ pathname: "/money/recurring/[id]", params: { id: rule.id } })}
      className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${last ? "" : "border-b border-divider"}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
          {rule.name}
        </Text>
        <Text numberOfLines={2} className="font-sans text-caption text-ink-muted">
          {detail}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-semibold text-label text-ink">{formatPeso(rule.amount)}</Text>
        <Text className="font-sans text-caption text-ink-muted">{next}</Text>
      </View>
    </Pressable>
  );
}

export default function RecurringScreen() {
  const colors = useColors();
  const rules = useRecurring();
  const accounts = useAccounts();
  const list = rules.data ?? [];
  const running = list.filter((r) => !r.is_paused);
  const monthly = running.filter((r) => r.kind === "expense").reduce((sum, r) => sum + monthlyAmount(r), 0);
  const accountName = (id: string) => accounts.data?.find((a) => a.id === id)?.name;
  const add = () => router.push("/money/recurring/new");

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Money"
          onPress={() => router.back()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" className="font-bold text-title text-ink">
            Recurring
          </Text>
          {list.length > 0 ? (
            <Text className="font-sans text-caption text-ink-muted">
              {running.length} running · {formatPeso(monthly)} a month
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-32 pt-2">
        {rules.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : rules.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your recurring items. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => rules.refetch()} />
          </View>
        ) : list.length === 0 ? (
          <EmptyState
            drawing="calendar"
            title="Add it once, and I log it for you"
            body="A daily ₱100 for transport saves itself. You can delete a day, or pause it for a holiday."
            action={{ label: "Add recurring", onPress: add }}
          />
        ) : (
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            {list.map((rule, index) => (
              <RecurringRow
                key={rule.id}
                rule={rule}
                accountName={accountName(rule.account_id)}
                last={index === list.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {list.length > 0 ? <Fab label="Add recurring" onPress={add} /> : null}
    </SafeAreaView>
  );
}
