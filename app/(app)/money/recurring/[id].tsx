import { format, isSameMonth, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { formatPeso, useAccounts } from "@/lib/money";
import {
  nextDate,
  nextText,
  scheduleText,
  useDeleteRecurring,
  useRecurring,
  useRecurringRows,
  useSetRecurringPaused,
} from "@/lib/recurring";

function Fact({ label, detail, value, auto }: { label: string; detail: string; value: string; auto?: boolean }) {
  return (
    <View className="flex-row items-center gap-3 border-b-2 border-border py-3">
      <View className="min-w-0 flex-1 gap-1">
        <Text className="font-semibold text-row-title text-ink">{label}</Text>
        <Text className="font-sans text-caption text-ink-muted">{detail}</Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-semibold text-label text-ink">{value}</Text>
        {auto ? <Badge label="Auto" tone="neutral" /> : null}
      </View>
    </View>
  );
}

export default function RecurringRuleScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rules = useRecurring();
  const accounts = useAccounts();
  const rows = useRecurringRows(id);
  const setPaused = useSetRecurringPaused();
  const remove = useDeleteRecurring();
  const [confirming, setConfirming] = useState(false);

  const rule = rules.data?.find((r) => r.id === id);
  const now = new Date();
  const saved = rows.data ?? [];
  const thisMonth = saved.filter((r) => isSameMonth(parseISO(r.occurred_on), now));
  const account = accounts.data?.find((a) => a.id === rule?.account_id)?.name ?? "";

  async function onDelete() {
    await remove.mutateAsync(id);
    setConfirming(false);
    router.back();
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar backLabel="Back to Recurring">
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" numberOfLines={1} className="font-bold text-title text-on-shell">
            {rule?.name ?? "Recurring"}
          </Text>
          {rule ? (
            <Text className="font-sans text-caption text-on-shell">
              {scheduleText(rule)} · {formatPeso(rule.amount)}
            </Text>
          ) : null}
        </View>
      </ModuleBar>

      {!rule ? (
        <View className="flex-1 items-center justify-center px-5">
          {rules.isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text className="text-center font-sans text-body text-ink-muted">This rule no longer exists.</Text>
          )}
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2">
          <View>
            <Fact
              label={rule.is_paused ? "Paused" : nextText(nextDate(rule, now), now).replace("Next: ", "Next ")}
              detail={account}
              value={formatPeso(rule.amount)}
            />
            {saved[0] ? (
              <Fact
                label="Last saved"
                detail={format(parseISO(saved[0].occurred_on), "EEE, MMM d")}
                value={formatPeso(saved[0].amount)}
                auto
              />
            ) : null}
            <Fact
              label="This month"
              detail={`${thisMonth.length} ${thisMonth.length === 1 ? "day" : "days"}`}
              value={formatPeso(thisMonth.reduce((sum, r) => sum + r.amount, 0))}
            />
          </View>

          <Text className="font-sans text-caption text-ink-muted">
            Pause it for a holiday. When you turn it on again, it does not add the days that you missed.
          </Text>
          {setPaused.error ? <Notice tone="danger">Could not save. Check your connection.</Notice> : null}

          <Button
            label={rule.is_paused ? "Resume" : "Pause"}
            loading={setPaused.isPending}
            onPress={() => setPaused.mutate({ id: rule.id, paused: !rule.is_paused })}
          />
          <Button
            label="Edit"
            variant="secondary"
            onPress={() => router.push({ pathname: "/money/recurring/edit", params: { id: rule.id } })}
          />
          <Button label="Delete recurring" variant="destructive" onPress={() => setConfirming(true)} />
        </ScrollView>
      )}

      <Sheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this rule?"
        subtitle="Saved rows stay."
      >
        {remove.error ? <Notice tone="danger">Could not delete. Check your connection.</Notice> : null}
        <Button label="Delete recurring" variant="destructive" loading={remove.isPending} onPress={onDelete} />
        <Button label="Go back" variant="secondary" onPress={() => setConfirming(false)} />
      </Sheet>
    </SafeAreaView>
  );
}
