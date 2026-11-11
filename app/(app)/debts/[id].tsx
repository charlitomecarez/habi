import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AmountInput } from "@/components/ui/AmountInput";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorText } from "@/lib/errors";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { debtStatus, useDebt, useDebtPayments, useDeleteDebt, useDeletePayment, useRecordPayment } from "@/lib/debts";
import { amountText, formatPeso, parseAmount } from "@/lib/money";

export default function DebtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const debt = useDebt(id);
  const payments = useDebtPayments(id);
  const record = useRecordPayment();
  const removePayment = useDeletePayment();
  const remove = useDeleteDebt();
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState<Date | null>(new Date());
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const d = debt.data;
  if (!d) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
        {debt.isPending ? (
          <View className="w-full flex-1 self-stretch pt-4">
            <Skeleton layout="detail" />
          </View>
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{debt.error ? errorText(debt.error) : "This debt was deleted."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={goBack} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const status = debtStatus(d);
  const owedToMe = d.direction === "owed_to_me";
  const failure = record.error ?? removePayment.error ?? remove.error;

  function openPayment() {
    if (!d) return;
    setAmount(amountText(d.balance));
    setPaidOn(new Date());
    setFormError(null);
    setPaying(true);
  }

  async function savePayment() {
    if (!d) return;
    const value = parseAmount(amount);
    if (value === null) return setFormError("Enter an amount, such as 500 or 1,250.00.");
    if (value > d.balance) return setFormError(`That is more than the ${formatPeso(d.balance)} left.`);
    await record.mutateAsync({ debtId: d.id, amount: value, paidOn: paidOn ?? new Date() });
    setPaying(false);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="people">
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
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        {failure ? <ErrorNotice error={failure} /> : null}

        <View className="gap-1">
          <Text className="font-medium text-label text-ink-muted">{owedToMe ? "Owes you" : "You owe"}</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            className="font-bold text-display text-ink"
          >
            {formatPeso(d.balance)}
          </Text>
          <Text className="font-sans text-caption text-ink-muted">
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
          <View>
            {(payments.data ?? []).length === 0 ? (
              <Text className="py-3 font-sans text-caption text-ink-muted">No payments yet.</Text>
            ) : (
              payments.data?.map((p, i) => (
                <View
                  key={p.id}
                  className={`min-h-touch flex-row items-center gap-3 py-2 pl-4 pr-1 ${i === (payments.data?.length ?? 0) - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-semibold text-row-title text-ink">{formatPeso(p.amount)}</Text>
                    <Text className="font-sans text-caption text-ink-muted">
                      {format(parseISO(p.paid_on), "MMM d, yyyy")}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete payment of ${formatPeso(p.amount)}`}
                    onPress={() => removePayment.mutate(p.id)}
                    className="h-touch w-touch items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>

        <Button label="Delete debt" variant="destructive" size="input" onPress={() => setConfirmDelete(true)} />
        <ConfirmSheet
          visible={confirmDelete}
          title="Delete this debt?"
          body="Its payments are deleted too."
          confirmLabel="Delete debt"
          loading={remove.isPending}
          onConfirm={async () => {
            await remove.mutateAsync(d.id);
            goBack();
          }}
          onClose={() => setConfirmDelete(false)}
        />
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
        <DateTimeField label="Date" mode="date" value={paidOn} onChange={setPaidOn} />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <Button label="Save payment" loading={record.isPending} onPress={savePayment} />
      </Sheet>
    </SafeAreaView>
  );
}
