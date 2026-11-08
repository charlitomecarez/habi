import { format, isSameMonth, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
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

export default function RecurringRuleScreen() {
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
  const nextLine = rule && !rule.is_paused ? nextText(nextDate(rule, now), now).replace("Next: ", "") : undefined;

  async function onDelete() {
    await remove.mutateAsync(id);
    setConfirming(false);
    goBack();
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title={rule?.name ?? "Recurring"}
        backLabel="Back to Recurring"
        subtitle={rule ? `${scheduleText(rule)} · ${formatPeso(rule.amount)}` : undefined}
      />

      {!rule ? (
        <View className="flex-1 items-center justify-center px-5">
          {rules.isPending ? (
            <View className="w-full flex-1 self-stretch pt-4">
              <Skeleton layout="detail" />
            </View>
          ) : (
            <Text className="text-center font-sans text-body text-ink-muted">This rule no longer exists.</Text>
          )}
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-3">
          <View>
            <DataRow
              title={rule.is_paused ? "Paused" : "Next"}
              detail={[nextLine, account].filter(Boolean).join(" · ")}
              value={formatPeso(rule.amount)}
            />
            {saved[0] ? (
              <DataRow
                title="Last saved"
                detail={format(parseISO(saved[0].occurred_on), "EEE, MMM d")}
                value={formatPeso(saved[0].amount)}
                status={{ label: "Auto", tone: "muted" }}
              />
            ) : null}
            <DataRow
              title="This month"
              detail={`${thisMonth.length} ${thisMonth.length === 1 ? "day" : "days"}`}
              value={formatPeso(thisMonth.reduce((sum, r) => sum + r.amount, 0))}
            />
          </View>

          <Notice tone="neutral">
            Pause it for a holiday. When you turn it on again, it does not add the days that you missed.
          </Notice>
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
          <Button label="Delete recurring" variant="plain" size="input" onPress={() => setConfirming(true)} />
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
