import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { BANK_NAMES, buildReview, useReadStatement, useSaveImport, type ReviewRow } from "@/lib/import";
import { formatPeso, useAccounts, useCategories, useExpenseNames } from "@/lib/money";
import { pickStatement } from "@/lib/statement-file";

const shortDate = (date: string) => format(parseISO(date), "MMM d");

function statusBadge(row: ReviewRow) {
  if (row.status === "duplicate") return <Badge label="Possible duplicate" tone="warning" />;
  if (row.status === "pair") {
    return <Badge label={row.fee ? `Saved transfer, ${formatPeso(row.fee)} fee` : "Saved transfer"} tone="neutral" />;
  }
  if (row.kind === "transfer") return <Badge label="Transfer" tone="neutral" />;
  return null;
}

export default function ImportStatementScreen() {
  const colors = useColors();
  const accounts = useAccounts();
  const categories = useCategories();
  const names = useExpenseNames();
  const read = useReadStatement();
  const save = useSaveImport();

  const [chosenAccount, setChosenAccount] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<ReviewRow>>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  const statement = read.data?.statement;
  const accountList = accounts.data ?? [];
  const matched = statement
    ? accountList.find((a) => a.name.toLowerCase() === BANK_NAMES[statement.bank].toLowerCase())
    : undefined;
  const accountId = chosenAccount ?? matched?.id ?? null;

  const review = useMemo(() => {
    if (!read.data || !accountId) return null;
    return buildReview(
      read.data.statement,
      accountId,
      accounts.data ?? [],
      read.data.existing,
      names.data ?? [],
      categories.data ?? [],
    );
  }, [read.data, accountId, accounts.data, names.data, categories.data]);

  const rows = (review?.rows ?? []).map((r) => ({ ...r, ...edits[r.ref] }));
  const ticked = rows.filter((r) => r.include);
  const current = rows.find((r) => r.ref === editing);
  const rowCategories = (categories.data ?? []).filter((c) => c.kind === current?.kind);

  const patch = (ref: string, change: Partial<ReviewRow>) =>
    setEdits((all) => ({ ...all, [ref]: { ...all[ref], ...change } }));

  async function onPick() {
    const form = await pickStatement();
    if (!form) return;
    setEdits({});
    setChosenAccount(null);
    setSaved(null);
    read.mutate(form);
  }

  async function onSave() {
    setSaved(await save.mutateAsync(ticked));
    read.reset();
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Import statement
        </Text>
      </View>

      {read.isPending ? (
        <View className="flex-1 items-center justify-center gap-3 px-5">
          <ActivityIndicator color={colors.accent} />
          <Text className="text-center font-sans text-body text-ink-muted">
            Reading the statement. The first read can take 10 seconds.
          </Text>
        </View>
      ) : !statement ? (
        <View className="flex-1 justify-center gap-4 px-5">
          {saved !== null ? (
            <Text className="text-center font-semibold text-heading text-ink">
              Saved {saved} {saved === 1 ? "transaction" : "transactions"}.
            </Text>
          ) : null}
          <Text className="text-center font-sans text-body text-ink-muted">
            Choose a GoTyme, GCash or MariBank PDF. You review each row before anything saves.
          </Text>
          {read.error ? <Notice tone="danger">{read.error.message}</Notice> : null}
          <Button label="Choose PDF" onPress={onPick} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerClassName="gap-4 px-5 pb-6 pt-2">
            <View className="gap-1">
              <Text className="font-semibold text-heading text-ink">{BANK_NAMES[statement.bank]}</Text>
              <Text className="font-sans text-caption text-ink-muted">
                {shortDate(statement.from)} to {shortDate(statement.to)} · Totals match the statement
              </Text>
            </View>

            {!matched ? (
              <Select
                label="Account"
                options={accountList.map((a) => ({ value: a.id, label: a.name }))}
                value={accountId}
                onChange={setChosenAccount}
              />
            ) : null}

            {review && review.alreadySaved > 0 ? (
              <Text className="font-sans text-caption text-ink-muted">
                {review.alreadySaved} {review.alreadySaved === 1 ? "row is" : "rows are"} already in Money.
              </Text>
            ) : null}

            {review && rows.length === 0 ? (
              <Text className="font-sans text-body text-ink-muted">This statement has no new rows.</Text>
            ) : null}

            {rows.length > 0 ? (
              <View>
                {rows.map((row, index) => (
                  <View
                    key={row.ref}
                    className={`min-h-touch flex-row items-center gap-1 py-2 pr-4 ${index < rows.length - 1 ? "border-b-2 border-border" : ""}`}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: row.include }}
                      accessibilityLabel={`Save ${row.name}`}
                      onPress={() => patch(row.ref, { include: !row.include })}
                      className="h-touch w-touch items-center justify-center"
                    >
                      <Ionicons
                        name={row.include ? "checkbox" : "square-outline"}
                        size={22}
                        color={row.include ? colors.accent : colors.inkMuted}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${row.name}`}
                      disabled={row.kind === "transfer"}
                      onPress={() => setEditing(row.ref)}
                      className="min-w-0 flex-1 flex-row items-center gap-3"
                    >
                      <View className="min-w-0 flex-1 gap-1">
                        <Text numberOfLines={1} className="font-medium text-row-title text-ink">
                          {row.name}
                        </Text>
                        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
                          {shortDate(row.occurredOn)}
                          {row.kind === "transfer"
                            ? ""
                            : ` · ${categories.data?.find((c) => c.id === row.categoryId)?.name ?? "No category"}`}
                        </Text>
                        {statusBadge(row)}
                      </View>
                      <Text className="font-semibold text-row-title text-ink">
                        {row.kind === "income" ? "+" : ""}
                        {formatPeso(row.amount)}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <View className="gap-2 border-t-2 border-border px-5 pb-6 pt-3">
            {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
            <Button
              label={`Save ${ticked.length} ${ticked.length === 1 ? "transaction" : "transactions"}`}
              loading={save.isPending}
              disabled={ticked.length === 0}
              onPress={onSave}
            />
          </View>
        </>
      )}

      <Sheet visible={current !== undefined} onClose={() => setEditing(null)} title="Edit row">
        {current ? (
          <>
            <Input
              label="Name"
              value={current.name}
              onChangeText={(name) => patch(current.ref, { name })}
              maxLength={120}
            />
            <View className="flex-row flex-wrap gap-2">
              {rowCategories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={current.categoryId === c.id}
                  onPress={() => patch(current.ref, { categoryId: current.categoryId === c.id ? null : c.id })}
                />
              ))}
            </View>
            <Button label="Done" onPress={() => setEditing(null)} />
          </>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}
