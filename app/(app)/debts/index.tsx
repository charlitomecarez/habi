import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { DIRECTION_OPTIONS, debtStatus, useDebts, type Debt, type DebtDirection } from "@/lib/debts";
import { formatPeso } from "@/lib/money";

function DebtRow({ d, last }: { d: Debt; last: boolean }) {
  const status = debtStatus(d);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d.person_name}, ${formatPeso(d.balance)} left of ${formatPeso(d.amount)}, ${status.text}`}
      onPress={() => router.push({ pathname: "/debts/[id]", params: { id: d.id } })}
      className={`min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted ${last ? "" : "border-b-2 border-border"}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
          {d.person_name}
        </Text>
        <Badge label={status.text} tone={status.tone} />
      </View>
      <View className="items-end gap-1">
        <Text className={`font-semibold text-row-title ${d.balance > 0 ? "text-ink" : "text-ink-muted"}`}>
          {formatPeso(d.balance)}
        </Text>
        {d.paid > 0 ? <Text className="font-sans text-badge text-ink-muted">of {formatPeso(d.amount)}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function DebtsScreen() {
  const colors = useColors();
  const [direction, setDirection] = useState<DebtDirection>("owed_to_me");
  const debts = useDebts();
  const all = debts.data ?? [];
  const list = all.filter((d) => d.direction === direction);
  const open = list.filter((d) => d.balance > 0);
  const paid = list.filter((d) => d.balance <= 0);
  const total = (dir: DebtDirection) => all.filter((d) => d.direction === dir).reduce((s, d) => s + d.balance, 0);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title="Debts"
        tone="people"
        subtitle={`They owe you ${formatPeso(total("owed_to_me"))} · You owe ${formatPeso(total("i_owe"))}`}
      />

      <ScrollView contentContainerClassName="gap-5 px-5 pb-fab-clear pt-3">
        <Segmented label="Show" options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />

        {debts.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : debts.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your debts. {debts.error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => debts.refetch()} />
          </View>
        ) : (
          <>
            <View>
              {open.length === 0 ? (
                <Text className="py-3 font-sans text-caption text-ink-muted">
                  {direction === "owed_to_me" ? "Nobody owes you right now." : "You don't owe anyone right now."}
                </Text>
              ) : (
                open.map((d, i) => <DebtRow key={d.id} d={d} last={i === open.length - 1} />)
              )}
            </View>
            {paid.length > 0 ? (
              <View className="gap-2">
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  Paid
                </Text>
                <View>
                  {paid.map((d, i) => (
                    <DebtRow key={d.id} d={d} last={i === paid.length - 1} />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Fab label="Add debt" onPress={() => router.push({ pathname: "/debts/new", params: { direction } })} />
    </SafeAreaView>
  );
}
