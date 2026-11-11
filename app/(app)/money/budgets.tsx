import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BudgetRow } from "@/components/money/BudgetRow";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBudgetMonths, useBudgets, useDeleteBudget, useSaveBudget, type Budget } from "@/lib/budgets";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { errorText } from "@/lib/errors";
import { amountText, parseAmount, useCategories } from "@/lib/money";

export default function BudgetsScreen() {
  const budgets = useBudgets();
  const months = useBudgetMonths();
  const categories = useCategories();
  const save = useSaveBudget();
  const remove = useDeleteBudget();
  const [editing, setEditing] = useState<Budget | "new" | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [limit, setLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const expense = (categories.data ?? []).filter((c) => c.kind === "expense");
  const nameOf = (id: string) => expense.find((c) => c.id === id)?.name ?? "Category";
  const taken = new Set((budgets.data?.budgets ?? []).map((b) => b.category_id));

  function open(b: Budget | "new") {
    setError(null);
    setCategoryId(b === "new" ? (expense.find((c) => !taken.has(c.id))?.id ?? null) : b.category_id);
    setLimit(b === "new" ? "" : amountText(b.monthly_limit));
    setEditing(b);
  }

  async function onSave() {
    const value = parseAmount(limit);
    if (!categoryId) return setError("Choose a category.");
    if (value === null) return setError("Enter the monthly limit, such as 8,000.");
    await save.mutateAsync({ id: editing && editing !== "new" ? editing.id : undefined, categoryId, limit: value });
    setEditing(null);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar>
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Budgets
        </Text>
      </ModuleBar>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-fab-clear pt-2">
        <Text className="font-sans text-caption text-ink-muted">
          Money you don&apos;t spend carries over to next month. Going over does not take from next month. You get a
          notification at 80% and at 100%.
        </Text>
        {budgets.isPending ? (
          <Skeleton />
        ) : budgets.error ? (
          <ErrorNotice lead="Could not load your budgets." error={budgets.error} />
        ) : (
          <View>
            {(months ?? []).length === 0 ? (
              <Text className="py-3 font-sans text-caption text-ink-muted">No budgets yet.</Text>
            ) : (
              months?.map((m, i) => (
                <Pressable
                  key={m.budget.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${nameOf(m.budget.category_id)} budget`}
                  onPress={() => open(m.budget)}
                  className="active:bg-surface-muted"
                >
                  <BudgetRow b={m} name={nameOf(m.budget.category_id)} last={i === (months?.length ?? 0) - 1} />
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Fab label="Add budget" onPress={() => open("new")} />

      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add budget" : "Edit budget"}
      >
        <Select
          label="Category"
          options={expense
            .filter((c) => !taken.has(c.id) || (editing !== "new" && editing?.category_id === c.id))
            .map((c) => ({ value: c.id, label: c.name }))}
          value={categoryId}
          onChange={setCategoryId}
        />
        <AmountInput
          label="Each month"
          unit="₱"
          unitPosition="start"
          value={limit}
          onChangeText={setLimit}
          inputMode="decimal"
          keyboardType="decimal-pad"
        />
        {error || save.error ? <Notice tone="danger">{error ?? errorText(save.error)}</Notice> : null}
        <Button label="Save budget" loading={save.isPending} onPress={onSave} />
        {editing && editing !== "new" ? (
          <Button
            label="Delete budget"
            variant="destructive"
            size="input"
            loading={remove.isPending}
            onPress={async () => {
              await remove.mutateAsync(editing.id);
              setEditing(null);
            }}
          />
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}
