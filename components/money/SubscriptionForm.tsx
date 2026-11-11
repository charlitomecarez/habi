import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, parseISO } from "date-fns";
import { router } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { useDiscardGuard } from "@/components/ui/DiscardGuard";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import {
  amountText,
  CURRENCIES,
  CYCLE_OPTIONS,
  formatPeso,
  parseAmount,
  useAccounts,
  useCategories,
  useDeleteSubscription,
  useExchangeRates,
  useSaveSubscription,
  type Subscription,
  type SubscriptionKind,
} from "@/lib/money";

const NONE = "none";
/** The seeded expense category new subscriptions start in. */
const DEFAULT_CATEGORY = "Subscriptions";
/** The category new bills start in, when you have one by that name. */
const DEFAULT_BILL_CATEGORY = /^(bills|utilities)/i;

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

/** Reminder choices, in days before the billing date. The reminder always arrives at 9:00 AM. */
const REMIND_DAYS = [2, 1, 0, 7];

function remindLabel(days: number): string {
  if (days === 0) return "On the day, 9:00 AM";
  if (days === 7) return "1 week before, 9:00 AM";
  return `${days} ${days === 1 ? "day" : "days"} before, 9:00 AM`;
}

const AUTO_ADD_OPTIONS = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
] as const;

const schema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(80, "Use 80 characters or fewer."),
    kind: z.enum(["subscription", "bill"]),
    amount: z.string(),
    currency: z.enum(CURRENCIES),
    billingCycle: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
    nextBillingOn: z
      .date()
      .nullable()
      .refine((v) => Boolean(v), "Choose the next billing date."),
    accountId: z.string(),
    categoryId: z.string(),
    remindDaysBefore: z.string(),
    notes: z.string(),
    autoAdd: z.enum(["on", "off"]),
  })
  .refine((v) => v.kind === "bill" || parseAmount(v.amount) !== null, {
    path: ["amount"],
    message: "Enter an amount, such as 149 or 20.00.",
  })
  .refine((v) => v.kind === "bill" || v.autoAdd === "off" || v.accountId !== NONE, {
    path: ["accountId"],
    message: "Choose the account it is charged to, or turn off auto-add.",
  });

type FormValues = z.infer<typeof schema>;

function defaults(subscription: Subscription | undefined, kind: SubscriptionKind): FormValues {
  return {
    kind: subscription?.kind ?? kind,
    name: subscription?.name ?? "",
    amount: amountText(subscription?.amount),
    currency: subscription?.currency === "USD" ? "USD" : "PHP",
    billingCycle: subscription?.billing_cycle ?? "monthly",
    nextBillingOn: subscription ? parseISO(subscription.next_billing_on) : addMonths(new Date(), 1),
    accountId: subscription?.account_id ?? NONE,
    categoryId: subscription?.category_id ?? NONE,
    remindDaysBefore: String(subscription?.remind_days_before ?? 2),
    notes: subscription?.notes ?? "",
    // On for new subscriptions; an existing one keeps its setting.
    autoAdd: subscription ? (subscription.auto_add ? "on" : "off") : "on",
  };
}

/**
 * Full-screen form for a new subscription or bill, or for editing one when `subscription` is set.
 * A bill has no fixed amount and no auto-add: you type the amount when you pay.
 */
export function SubscriptionForm({
  subscription,
  kind: newKind = "subscription",
}: {
  subscription?: Subscription;
  kind?: SubscriptionKind;
}) {
  const kind = subscription?.kind ?? newKind;
  const isBill = kind === "bill";
  const colors = useColors();
  const accounts = useAccounts();
  const categories = useCategories();
  const rates = useExchangeRates();
  const save = useSaveSubscription();
  const remove = useDeleteSubscription();

  const { control, handleSubmit, formState, setValue, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(subscription, kind),
  });
  const discard = useDiscardGuard(formState.isDirty, "The bill is not saved.");
  const currency = useWatch({ control, name: "currency" });
  const amount = parseAmount(useWatch({ control, name: "amount" }) ?? "");
  const autoAdd = useWatch({ control, name: "autoAdd" });

  const defaultCategoryId = (categories.data ?? []).find(
    (c) => c.kind === "expense" && (isBill ? DEFAULT_BILL_CATEGORY.test(c.name) : c.name === DEFAULT_CATEGORY),
  )?.id;

  // A new subscription goes in the "Subscriptions" category once categories load.
  useEffect(() => {
    if (!subscription && defaultCategoryId && getValues("categoryId") === NONE) {
      setValue("categoryId", defaultCategoryId);
    }
  }, [subscription, defaultCategoryId, getValues, setValue]);

  const accountOptions = [
    { value: NONE, label: "No account" },
    ...(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name })),
  ];
  const currentRemind = Number(subscription?.remind_days_before ?? 2);
  const remindOptions = [...new Set([...REMIND_DAYS, currentRemind])].map((d) => ({
    value: String(d),
    label: remindLabel(d),
  }));

  const rate = currency === "PHP" ? null : (rates.data?.find((r) => r.currency === currency)?.rateToPhp ?? null);
  const conversion =
    currency === "PHP"
      ? null
      : rate === null
        ? `Set the ${currency} rate in More › Exchange rates to see this in pesos.`
        : amount !== null
          ? `≈ ${formatPeso(amount * rate)} at your rate of ₱${rate} per ${currency}`
          : `Your rate: ₱${rate} per ${currency}`;

  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync({
      id: subscription?.id,
      input: {
        name: values.name,
        kind: values.kind,
        amount: values.kind === "bill" ? null : parseAmount(values.amount)!,
        currency: values.currency,
        billingCycle: values.billingCycle,
        nextBillingOn: values.nextBillingOn!,
        accountId: values.accountId === NONE ? null : values.accountId,
        categoryId: values.categoryId === NONE ? null : values.categoryId,
        remindDaysBefore: Number(values.remindDaysBefore),
        notes: values.notes.trim() || null,
        autoAdd: values.autoAdd === "on",
      },
    });
    discard.allowLeave();
    goBack();
  });

  async function onDelete() {
    if (!subscription) return;
    await remove.mutateAsync(subscription.id);
    discard.allowLeave();
    goBack();
  }

  function onLogPayment() {
    if (!subscription) return;
    router.push({
      pathname: "/money/transaction/new",
      params: {
        subscriptionId: subscription.id,
        merchant: subscription.name,
        // A foreign amount is not the peso amount that left the account, so leave it for you to enter.
        ...(subscription.currency === "PHP" && subscription.amount !== null
          ? { amount: amountText(subscription.amount) }
          : {}),
        ...(subscription.account_id ? { accountId: subscription.account_id } : {}),
        ...(subscription.category_id ? { categoryId: subscription.category_id } : {}),
      },
    });
  }

  const failure = save.error ?? remove.error;

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
            {subscription ? (isBill ? "Edit bill" : "Edit subscription") : isBill ? "Add bill" : "Add subscription"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Input
                label="Name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={isBill ? "Meralco" : "Netflix"}
                maxLength={80}
                error={fieldState.error?.message}
              />
            )}
          />

          {isBill ? (
            <Text className="font-sans text-caption text-ink-muted">
              The amount changes each month, so you type it when you pay.
            </Text>
          ) : (
            <View className="gap-2">
              <View className="flex-row gap-3">
                <View className="w-field-sm">
                  <Controller
                    control={control}
                    name="currency"
                    render={({ field }) => (
                      <Select
                        label="Currency"
                        options={CURRENCY_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Controller
                    control={control}
                    name="amount"
                    render={({ field, fieldState }) => (
                      <View className="gap-2">
                        <Text className="font-semibold text-label text-ink">Amount</Text>
                        <TextInput
                          accessibilityLabel={`Amount in ${currency}`}
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="0.00"
                          placeholderTextColor={colors.inkMuted}
                          inputMode="decimal"
                          keyboardType="decimal-pad"
                          className={`h-input rounded-input border-2 bg-surface-card px-4 font-semibold text-body text-ink ${fieldState.error ? "border-danger" : "border-accent"}`}
                        />
                      </View>
                    )}
                  />
                </View>
              </View>
              {formState.errors.amount ? (
                <Text className="font-sans text-caption text-danger">{formState.errors.amount.message}</Text>
              ) : conversion ? (
                <Text className="font-sans text-caption text-ink-muted">{conversion}</Text>
              ) : null}
            </View>
          )}

          <Controller
            control={control}
            name="billingCycle"
            render={({ field }) => (
              <View className="gap-2">
                <Text className="font-semibold text-label text-ink">Billed</Text>
                <Segmented label="Billed" options={CYCLE_OPTIONS} value={field.value} onChange={field.onChange} />
              </View>
            )}
          />

          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="nextBillingOn"
              render={({ field }) => (
                <DateTimeField
                  label={isBill ? "Next due" : "Next billing"}
                  mode="date"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <View className="min-w-0 flex-1">
              <Controller
                control={control}
                name="accountId"
                render={({ field }) => (
                  <Select label="Charged to" options={accountOptions} value={field.value} onChange={field.onChange} />
                )}
              />
            </View>
          </View>
          {formState.errors.nextBillingOn ? (
            <Text className="font-sans text-caption text-danger">{formState.errors.nextBillingOn.message}</Text>
          ) : null}
          {formState.errors.accountId ? (
            <Text className="font-sans text-caption text-danger">{formState.errors.accountId.message}</Text>
          ) : null}

          {isBill ? null : (
            <Controller
              control={control}
              name="autoAdd"
              render={({ field }) => (
                <View className="gap-2">
                  <Text className="font-semibold text-label text-ink">Add the expense on the billing day</Text>
                  <Segmented
                    label="Add the expense on the billing day"
                    options={AUTO_ADD_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <Text className="font-sans text-caption text-ink-muted">
                    {autoAdd === "on"
                      ? currency === "PHP"
                        ? "Habi adds the expense to the account on each billing day. You still get the reminder."
                        : `Habi adds the expense in pesos at your ${currency} rate. With no rate set, it waits for you to log it.`
                      : "You log each payment yourself with Log payment."}
                  </Text>
                </View>
              )}
            />
          )}

          <Controller
            control={control}
            name="remindDaysBefore"
            render={({ field }) => (
              <Select label="Remind me" options={remindOptions} value={field.value} onChange={field.onChange} />
            )}
          />

          {subscription ? (
            <View className="gap-3">
              <Button label="Log payment" variant="secondary" size="input" onPress={onLogPayment} />
              <Button
                label={isBill ? "Delete bill" : "Delete subscription"}
                variant="destructive"
                size="input"
                loading={remove.isPending}
                disabled={save.isPending}
                onPress={onDelete}
              />
            </View>
          ) : null}
        </KeyboardScrollView>

        <View className="gap-3 border-t-2 border-border px-5 pb-6 pt-3">
          {failure ? <Notice tone="danger">{failure.message}</Notice> : null}
          <Button
            label={isBill ? "Save bill" : "Save subscription"}
            loading={formState.isSubmitting}
            disabled={remove.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
      {discard.sheet}
    </SafeAreaView>
  );
}
