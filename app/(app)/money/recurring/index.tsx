import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { formatPeso, useAccounts } from "@/lib/money";
import { monthlyAmount, nextDate, nextText, scheduleText, useRecurring, type Recurring } from "@/lib/recurring";

function RecurringRow({ rule, accountName, last }: { rule: Recurring; accountName?: string; last: boolean }) {
  const income = rule.kind === "income";
  const today = new Date();
  return (
    <DataRow
      title={rule.name}
      detail={[scheduleText(rule), income ? "Income" : accountName].filter(Boolean).join(" · ")}
      value={formatPeso(rule.amount)}
      status={
        rule.is_paused
          ? { label: "Paused", tone: "watch" }
          : { label: nextText(nextDate(rule, today), today), tone: "muted" }
      }
      onPress={() => router.push({ pathname: "/money/recurring/[id]", params: { id: rule.id } })}
      last={last}
    />
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
      <ModuleHeader
        title="Recurring"
        backLabel="Back to Money"
        subtitle={list.length > 0 ? `${running.length} running · ${formatPeso(monthly)} a month` : undefined}
      />

      <ScrollView contentContainerClassName="gap-4 px-5 pb-fab-clear pt-3">
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
          <View>
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
