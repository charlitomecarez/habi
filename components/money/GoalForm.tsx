import { Ionicons } from "@expo/vector-icons";
import { parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useDeleteGoal, useSaveGoal, type Goal } from "@/lib/goals";
import { amountText, parseAmount, useAccounts } from "@/lib/money";

const NONE = "none";

/** Full-screen form for a savings goal. */
export function GoalForm({ goal }: { goal?: Goal }) {
  const colors = useColors();
  const accounts = useAccounts();
  const save = useSaveGoal();
  const remove = useDeleteGoal();
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(amountText(goal?.target_amount));
  const [date, setDate] = useState<Date | null>(goal?.target_date ? parseISO(goal.target_date) : null);
  const [accountId, setAccountId] = useState(goal?.account_id ?? NONE);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    const value = parseAmount(target);
    if (!name.trim()) return setError("Name the goal, for example New phone.");
    if (value === null) return setError("Enter the target amount, such as 30,000.");
    await save.mutateAsync({
      id: goal?.id,
      name: name.trim(),
      target: value,
      targetDate: date,
      accountId: accountId === NONE ? null : accountId,
    });
    goBack();
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <KeyboardAvoidingView className="flex-1">
        <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={goBack}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" className="font-bold text-title text-ink">
            {goal ? "Edit goal" : "Add savings goal"}
          </Text>
        </View>
        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Input label="Goal" value={name} onChangeText={setName} placeholder="New phone" maxLength={80} />
          <AmountInput
            label="Target"
            unit="₱"
            unitPosition="start"
            value={target}
            onChangeText={setTarget}
            inputMode="decimal"
            keyboardType="decimal-pad"
            placeholder="30,000"
          />
          <DateTimeField label="By (optional)" mode="date" value={date} onChange={setDate} />
          <Select
            label="Saved in (optional)"
            options={[
              { value: NONE, label: "No account" },
              ...(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name })),
            ]}
            value={accountId}
            onChange={setAccountId}
          />
          <Text className="font-sans text-caption text-ink-muted">
            The goal counts only the money you mark for it, so two goals can share one account.
          </Text>
          {goal ? (
            <Button
              label="Delete goal"
              variant="destructive"
              size="input"
              loading={remove.isPending}
              onPress={async () => {
                await remove.mutateAsync(goal.id);
                router.dismissAll();
              }}
            />
          ) : null}
        </KeyboardScrollView>
        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {error || save.error ? <Notice tone="danger">{error ?? save.error?.message}</Notice> : null}
          <Button label="Save goal" loading={save.isPending} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
