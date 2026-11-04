import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO } from "date-fns";
import { router } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { useColors } from "@/lib/colors";
import {
  amountText,
  formatMoney,
  parseAmount,
  useAccounts,
  useCategories,
  useDeleteTransaction,
  useSaveTransaction,
  useSubscriptions,
  type Account,
  type Transaction,
  type TransactionKind,
} from "@/lib/money";

const NONE = "none";

const KIND_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

const KIND_NOUN: Record<TransactionKind, string> = { expense: "expense", income: "income", transfer: "transfer" };
const ACCOUNT_LABEL: Record<TransactionKind, string> = {
  expense: "Paid from",
  income: "Received in",
  transfer: "From account",
};

const schema = z
  .object({
    kind: z.enum(["expense", "income", "transfer"]),
    amount: z.string().refine((v) => parseAmount(v) !== null, "Enter an amount, such as 150 or 89.50."),
    accountId: z.string().min(1, "Choose an account."),
    toAccountId: z.string(),
    categoryId: z.string(),
    subscriptionId: z.string(),
    occurredOn: z
      .date()
      .nullable()
      .refine((v) => Boolean(v), "Choose a date."),
    merchant: z.string(),
    note: z.string(),
  })
  .refine((v) => v.kind !== "transfer" || (v.toAccountId !== NONE && v.toAccountId !== v.accountId), {
    message: "Choose a different account to move the money to.",
    path: ["toAccountId"],
  });

type FormValues = z.infer<typeof schema>;

/** Values to start a new transaction with, e.g. from a subscription's "Log payment". */
export type TransactionPrefill = {
  amount?: string;
  accountId?: string;
  categoryId?: string;
  subscriptionId?: string;
  merchant?: string;
};

function defaults(
  transaction: Transaction | undefined,
  prefill: TransactionPrefill,
  firstAccountId: string,
): FormValues {
  return {
    kind: transaction?.kind ?? "expense",
    amount: transaction ? amountText(transaction.amount) : (prefill.amount ?? ""),
    accountId: transaction?.account_id ?? prefill.accountId ?? firstAccountId,
    toAccountId: transaction?.to_account_id ?? NONE,
    categoryId: transaction?.category_id ?? prefill.categoryId ?? NONE,
    subscriptionId: transaction?.subscription_id ?? prefill.subscriptionId ?? NONE,
    occurredOn: transaction ? parseISO(transaction.occurred_on) : new Date(),
    merchant: transaction?.merchant ?? prefill.merchant ?? "",
    note: transaction?.note ?? "",
  };
}

/** How a transaction changes one account's balance. */
function effectOn(accountId: string, t: Pick<Transaction, "kind" | "account_id" | "to_account_id" | "amount">): number {
  if (t.kind === "income" && t.account_id === accountId) return t.amount;
  if (t.kind === "expense" && t.account_id === accountId) return -t.amount;
  if (t.kind === "transfer" && t.account_id === accountId) return -t.amount;
  if (t.kind === "transfer" && t.to_account_id === accountId) return t.amount;
  return 0;
}

/** The source account's balance once this form is saved. Null until the amount is valid. */
function balanceAfter(account: Account | undefined, values: FormValues, saved: Transaction | undefined): number | null {
  const amount = parseAmount(values.amount);
  if (!account || amount === null) return null;
  const draft = {
    kind: values.kind,
    account_id: values.accountId,
    to_account_id: values.kind === "transfer" ? values.toAccountId : null,
    amount,
  };
  // The balance already includes the saved version of this transaction; swap it for the draft.
  return account.balance - (saved ? effectOn(account.id, saved) : 0) + effectOn(account.id, draft);
}

type TransactionFormProps = {
  transaction?: Transaction;
  prefill?: TransactionPrefill;
};

/** Full-screen form for an expense, income or transfer. Edits one when `transaction` is set. */
export function TransactionForm({ transaction, prefill = {} }: TransactionFormProps) {
  const colors = useColors();
  const accounts = useAccounts();
  const categories = useCategories();
  const subscriptions = useSubscriptions();
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();

  const accountOptions = (accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }));

  const { control, handleSubmit, formState, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(transaction, prefill, accountOptions[0]?.value ?? ""),
  });
  const values = useWatch({ control }) as FormValues;
  const kind = values.kind;
  const accountId = values.accountId;

  // Accounts load after the form mounts when the screen opens cold.
  const firstAccountId = accountOptions[0]?.value;
  useEffect(() => {
    if (!accountId && firstAccountId) setValue("accountId", firstAccountId);
  }, [accountId, firstAccountId, setValue]);

  const kindCategories = (categories.data ?? []).filter((c) => c.kind === kind);
  const subscriptionOptions = [
    { value: NONE, label: "None" },
    ...(subscriptions.data ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];
  const toAccountOptions = accountOptions.filter((a) => a.value !== accountId);

  const account = accounts.data?.find((a) => a.id === accountId);
  const after = balanceAfter(account, values, transaction);

  const onSubmit = handleSubmit(async (v) => {
    await save.mutateAsync({
      id: transaction?.id,
      input: {
        kind: v.kind,
        amount: parseAmount(v.amount)!,
        accountId: v.accountId,
        toAccountId: v.toAccountId === NONE ? null : v.toAccountId,
        categoryId: v.categoryId === NONE ? null : v.categoryId,
        subscriptionId: v.subscriptionId === NONE ? null : v.subscriptionId,
        occurredOn: v.occurredOn!,
        merchant: v.merchant.trim() || null,
        note: v.note.trim() || null,
      },
    });
    router.back();
  });

  async function onDelete() {
    if (!transaction) return;
    await remove.mutateAsync(transaction.id);
    router.back();
  }

  const failure = save.error ?? remove.error ?? accounts.error;
  const noun = KIND_NOUN[kind];

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <KeyboardAvoidingView className="flex-1">
        <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" className="font-bold text-title text-ink">
            {transaction ? `Edit ${noun}` : `Add ${noun}`}
          </Text>
        </View>

        <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <Segmented
                label="Type"
                options={KIND_OPTIONS}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  // Categories belong to one kind, so a switch clears the choice.
                  setValue("categoryId", NONE);
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field, fieldState }) => (
              <AmountInput
                label="Amount"
                unit="₱"
                unitPosition="start"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="0.00"
                inputMode="decimal"
                keyboardType="decimal-pad"
                autoFocus={!transaction && !prefill.amount}
                error={fieldState.error?.message}
              />
            )}
          />

          {kind === "transfer" ? (
            <Controller
              control={control}
              name="toAccountId"
              render={({ field, fieldState }) => (
                <Select
                  label="To account"
                  options={toAccountOptions}
                  value={field.value === NONE ? null : field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          ) : (
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <View className="gap-2">
                  <Text className="font-semibold text-label text-ink">Category</Text>
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel="Category"
                    className="flex-row flex-wrap gap-2"
                  >
                    {kindCategories.map((c) => (
                      <Chip
                        key={c.id}
                        label={c.name}
                        selected={field.value === c.id}
                        // Tapping the chosen category again clears it.
                        onPress={() => field.onChange(field.value === c.id ? NONE : c.id)}
                      />
                    ))}
                  </View>
                </View>
              )}
            />
          )}

          <View className="flex-row gap-3">
            <View className="min-w-0 flex-1">
              <Controller
                control={control}
                name="accountId"
                render={({ field, fieldState }) => (
                  <Select
                    label={ACCOUNT_LABEL[kind]}
                    options={accountOptions}
                    value={field.value || null}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
            <Controller
              control={control}
              name="occurredOn"
              render={({ field }) => (
                <DateTimeField label="Date" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
          </View>
          {formState.errors.occurredOn ? (
            <Text className="font-sans text-caption text-danger">{formState.errors.occurredOn.message}</Text>
          ) : null}

          <Controller
            // Transfers keep this text in note, others in merchant; the key remounts the field on a switch.
            key={kind === "transfer" ? "note" : "merchant"}
            control={control}
            name={kind === "transfer" ? "note" : "merchant"}
            render={({ field }) => (
              <Input
                label="Where / note"
                optional
                value={field.value}
                onChangeText={field.onChange}
                placeholder={kind === "expense" ? "Jollibee" : kind === "income" ? "Employer or client" : "Why"}
                maxLength={120}
              />
            )}
          />

          {kind === "expense" && subscriptionOptions.length > 1 ? (
            <Controller
              control={control}
              name="subscriptionId"
              render={({ field }) => (
                <View className="gap-2">
                  <Select
                    label="Pays for subscription"
                    optional
                    options={subscriptionOptions}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <Text className="font-sans text-caption text-ink-muted">
                    A new payment moves the subscription&apos;s next renewal forward one cycle.
                  </Text>
                </View>
              )}
            />
          ) : null}

          {transaction ? (
            <Button
              label={`Delete ${noun}`}
              variant="destructive"
              size="input"
              loading={remove.isPending}
              disabled={save.isPending}
              onPress={onDelete}
            />
          ) : null}
        </ScrollView>

        <View className="gap-2 border-t border-border px-5 pb-6 pt-3">
          {failure ? <Notice tone="danger">{failure.message}</Notice> : null}
          {account && after !== null ? (
            <Text className="text-center font-sans text-caption text-ink-muted">
              {account.name} after this: {formatMoney(after, account.currency)}
            </Text>
          ) : null}
          <Button
            label={`Save ${noun}`}
            loading={formState.isSubmitting}
            disabled={remove.isPending || accountOptions.length === 0}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
