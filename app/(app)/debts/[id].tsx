import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AmountInput } from "@/components/ui/AmountInput";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { useColors } from "@/lib/colors";
import { debtStatus, useDebt, useDebtPayments, useDeleteDebt, useDeletePayment, useRecordPayment } from "@/lib/debts";
import { amountText, formatPeso, parseAmount, useAccounts } from "@/lib/money";

export default function DebtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const debt = useDebt(id);
  const payments = useDebtPayments(id);
  const accounts = useAccounts();
  const record = useRecordPayment();
  const removePayment = useDeletePayment();
  const remove = useDeleteDebt();
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState<Date | null>(new Date());
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const d = debt.data;
  if (!d) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
        {debt.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{debt.error ? debt.error.message : "This debt was deleted."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={() => router.back()} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const status = debtStatus(d);
  const owedToMe = d.direction === "owed_to_me";
  const accountOptions = (accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }));
  const accountName = (aid: string | null) => accounts.data?.find((a) => a.id === aid)?.name ?? "No account";
  const failure = record.error ?? removePayment.error ?? remove.error;

  function openPayment() {
    if (!d) return;
    setAmount(amountText(d.balance));
    setAccountId(accountId ?? accounts.data?.[0]?.id ?? null);
    setPaidOn(new Date());
    setFormError(null);
    setPaying(true);
  }

  async function savePayment() {
    if (!d) return;
    const value = parseAmount(amount);
    if (value === null) return setFormError("Enter an amount, such as 500 or 1,250.00.");
    if (value > d.balance) return setFormError(`That is more than the ${formatPeso(d.balance)} left.`);
    if (!accountId) return setFormError(owedToMe ? "Choose the account it went into." : "Choose the account you paid from.");
    await record.mutateAsync({ debtId: d.id, amount: value, paidOn: paidOn ?? new Date(), accountId });
    setPaying(false);
  }

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
        <Text accessibilityRole="header" numberOfLines={1} className="min-w-0 flex-1 font-bold text-title text-ink">
          {d.person_name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit debt"
          onPress={() => router.push({ pathname: "/debts/edit/[id]", params: { id: d.id } })}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-2">
        {failure ? <Notice tone="danger">{failure.message}</Notice> : null}

        <View className="gap-3 rounded-hero bg-accent p-5">
          <Text className="font-medium text-label text-on-accent/90">{owedToMe ? "Owes you" : "You owe"}</Text>
          <Text className="font-bold text-display text-on-accent">{formatPeso(d.balance)}</Text>
          <Text className="font-sans text-caption text-on-accent/90">
            {formatPeso(d.paid)} paid of {formatPeso(d.amount)} · since {format(parseISO(d.occurred_on), "MMM d, yyyy")}
          </Text>
        </View>
        <Badge label={status.text} tone={status.tone} />
        {d.note ? <Text className="font-sans text-body text-ink">{d.note}</Text> : null}

        {d.balance > 0 ? (
          <Button label={owedToMe ? "Record payment received" : "Record payment"} onPress={openPayment} />
        ) : null}

        <View className="gap-2">
          <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
            Payments
          </Text>
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            {(payments.data ?? []).length === 0 ? (
              <Text className="px-4 py-3 font-sans text-caption text-ink-muted">No payments yet.</Text>
            ) : (
              payments.data?.map((p, i) => (
                <View
                  key={p.id}
                  className={`min-h-touch flex-row items-center gap-3 py-2 pl-4 pr-1 ${i === (payments.data?.length ?? 0) - 1 ? "" : "border-b border-divider"}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-semibold text-row-title text-ink">{formatPeso(p.amount)}</Text>
                    <Text className="font-sans text-caption text-ink-muted">
                      {format(parseISO(p.paid_on), "MMM d, yyyy")} · {accountName(p.account_id)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete payment of ${formatPeso(p.amount)} and its transaction`}
                    onPress={() => removePayment.mutate(p.id)}
                    className="h-touch w-touch items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
          <Text className="font-sans text-caption text-ink-muted">
            Each payment adds {owedToMe ? "income" : "an expense"} in Money. Deleting a payment deletes it there too.
          </Text>
        </View>

        {confirmDelete ? (
          <View className="gap-3 rounded-card border border-danger bg-danger-tint p-4">
            <Text className="font-sans text-body text-danger">
              Delete this debt? Its payments and their Money transactions are deleted too.
            </Text>
            <Button
              label="Delete debt"
              variant="destructive"
              size="input"
              loading={remove.isPending}
              onPress={async () => {
                await remove.mutateAsync(d.id);
                router.back();
              }}
            />
            <Button label="Keep debt" variant="secondary" size="input" onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Button label="Delete debt" variant="destructive" size="input" onPress={() => setConfirmDelete(true)} />
        )}
      </ScrollView>

      <Sheet
        visible={paying}
        onClose={() => setPaying(false)}
        title={owedToMe ? "Payment received" : "Payment"}
        subtitle={`${formatPeso(d.balance)} left`}
      >
        <AmountInput
          label="Amount"
          unit="₱"
          unitPosition="start"
          value={amount}
          onChangeText={setAmount}
          inputMode="decimal"
          keyboardType="decimal-pad"
        />
        <Select
          label={owedToMe ? "Into account" : "From account"}
          options={accountOptions}
          value={accountId}
          onChange={setAccountId}
        />
        <DateTimeField label="Date" mode="date" value={paidOn} onChange={setPaidOn} />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <Button label="Save payment" loading={record.isPending} onPress={savePayment} />
      </Sheet>
    </SafeAreaView>
  );
}
