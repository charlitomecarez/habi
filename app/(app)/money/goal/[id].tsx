import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoalCard } from "@/components/money/GoalCard";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorText } from "@/lib/errors";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useAddContribution, useDeleteContribution, useGoals } from "@/lib/goals";
import { formatPeso, parseAmount, useAccounts } from "@/lib/money";

const DIRECTION = [
  { value: "in", label: "Add money" },
  { value: "out", label: "Take out" },
] as const;

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const goals = useGoals();
  const accounts = useAccounts();
  const add = useAddContribution();
  const remove = useDeleteContribution();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [on, setOn] = useState<Date | null>(new Date());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const g = goals.data?.goals.find((x) => x.id === id);
  if (!g) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
        {goals.isPending ? (
          <View className="w-full flex-1 self-stretch pt-4">
            <Skeleton layout="detail" />
          </View>
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{goals.error ? errorText(goals.error) : "This goal was deleted."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={goBack} />
          </View>
        )}
      </SafeAreaView>
    );
  }
  const list = (goals.data?.contributions ?? []).filter((c) => c.goal_id === id);
  const account = accounts.data?.find((a) => a.id === g.account_id)?.name;

  async function onSave() {
    const value = parseAmount(amount);
    if (value === null) return setError("Enter an amount, such as 2,000.");
    if (direction === "out" && value > g!.saved)
      return setError(`Only ${formatPeso(g!.saved)} is saved for this goal.`);
    await add.mutateAsync({
      goalId: id,
      amount: direction === "in" ? value : -value,
      on: on ?? new Date(),
      note: note.trim() || null,
    });
    setOpen(false);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar>
        <Text accessibilityRole="header" numberOfLines={1} className="min-w-0 flex-1 font-bold text-title text-ink">
          {g.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit goal"
          onPress={() => router.push({ pathname: "/money/goal/edit/[id]", params: { id } })}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.ink} />
        </Pressable>
      </ModuleBar>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        <View>
          <GoalCard g={g} last />
        </View>
        {account ? <Text className="font-sans text-caption text-ink-muted">Saved in {account}</Text> : null}
        <Button
          label="Add money to this goal"
          onPress={() => {
            setDirection("in");
            setAmount(g.perMonth ? String(g.perMonth) : "");
            setOn(new Date());
            setNote("");
            setError(null);
            setOpen(true);
          }}
        />
        <View className="gap-2">
          <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
            History
          </Text>
          <View>
            {list.length === 0 ? (
              <Text className="py-3 font-sans text-caption text-ink-muted">Nothing marked for this goal yet.</Text>
            ) : (
              list.map((c, i) => (
                <View
                  key={c.id}
                  className={`min-h-touch flex-row items-center gap-3 py-1 ${i === list.length - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text
                      className={`font-semibold text-row-title ${c.amount > 0 ? "text-accent-strong" : "text-ink"}`}
                    >
                      {c.amount > 0 ? "+" : "−"}
                      {formatPeso(Math.abs(c.amount))}
                    </Text>
                    <Text className="font-sans text-caption text-ink-muted">
                      {[format(parseISO(c.on_date), "MMM d, yyyy"), c.amount < 0 ? "Taken out" : null, c.note]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${formatPeso(Math.abs(c.amount))} on ${format(parseISO(c.on_date), "MMM d")}`}
                    onPress={() => remove.mutate(c.id)}
                    className="h-touch w-touch items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Sheet visible={open} onClose={() => setOpen(false)} title={g.name} subtitle={`${formatPeso(g.saved)} saved`}>
        <Segmented label="Add or take out" options={DIRECTION} value={direction} onChange={setDirection} />
        <AmountInput
          label="Amount"
          unit="₱"
          unitPosition="start"
          value={amount}
          onChangeText={setAmount}
          inputMode="decimal"
          keyboardType="decimal-pad"
        />
        <DateTimeField label="Date" mode="date" value={on} onChange={setOn} />
        <Input label="Note" optional value={note} onChangeText={setNote} />
        {error || add.error ? <Notice tone="danger">{error ?? errorText(add.error)}</Notice> : null}
        <Button label={direction === "in" ? "Save" : "Save withdrawal"} loading={add.isPending} onPress={onSave} />
      </Sheet>
    </SafeAreaView>
  );
}
