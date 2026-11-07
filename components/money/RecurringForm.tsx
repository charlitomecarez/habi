import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO } from "date-fns";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { amountText, parseAmount, toDateString, useAccounts, useCategories } from "@/lib/money";
import { SCHEDULES, useSaveRecurring, WEEK_DAYS, type Recurring } from "@/lib/recurring";

const NONE = "none";
const KINDS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
] as const;

const schema = z
  .object({
    kind: z.enum(["expense", "income"]),
    name: z.string().trim().min(1, "Enter a name.").max(80, "Use 80 characters or fewer."),
    amount: z.string().refine((v) => (parseAmount(v) ?? 0) > 0, "Enter an amount."),
    accountId: z.string().refine((v) => v !== NONE, "Choose an account."),
    categoryId: z.string(),
    schedule: z.enum(["daily", "weekdays", "weekends", "weekly", "monthly"]),
    weekDays: z.array(z.number()),
    monthDay: z.string(),
    startsOn: z
      .date()
      .nullable()
      .refine((v) => Boolean(v), "Choose a start date."),
    endsOn: z.date().nullable(),
  })
  .refine((v) => v.schedule !== "weekly" || v.weekDays.length > 0, {
    path: ["weekDays"],
    message: "Pick at least one day.",
  })
  .refine((v) => v.schedule !== "monthly" || (Number(v.monthDay) >= 1 && Number(v.monthDay) <= 31), {
    path: ["monthDay"],
    message: "Enter a day from 1 to 31.",
  })
  .refine((v) => !v.endsOn || !v.startsOn || v.endsOn >= v.startsOn, {
    path: ["endsOn"],
    message: "The end date must come after the start date.",
  });

type FormValues = z.infer<typeof schema>;

function defaults(rule?: Recurring): FormValues {
  return {
    kind: rule?.kind === "income" ? "income" : "expense",
    name: rule?.name ?? "",
    amount: rule ? amountText(rule.amount) : "",
    accountId: rule?.account_id ?? NONE,
    categoryId: rule?.category_id ?? NONE,
    schedule: (rule?.schedule as FormValues["schedule"] | undefined) ?? "daily",
    weekDays: rule?.week_days ?? [],
    monthDay: rule?.month_day ? String(rule.month_day) : "",
    startsOn: rule ? parseISO(rule.starts_on) : new Date(),
    endsOn: rule?.ends_on ? parseISO(rule.ends_on) : null,
  };
}

/** Full-screen form for a new rule, or for editing one when `rule` is set. */
export function RecurringForm({ rule }: { rule?: Recurring }) {
  const colors = useColors();
  const accounts = useAccounts();
  const categories = useCategories();
  const save = useSaveRecurring();
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(rule),
  });
  const kind = useWatch({ control, name: "kind" });
  const schedule = useWatch({ control, name: "schedule" });

  const accountOptions = [
    { value: NONE, label: "Choose an account" },
    ...(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name })),
  ];
  const categoryOptions = [
    { value: NONE, label: "No category" },
    ...(categories.data ?? []).filter((c) => c.kind === kind).map((c) => ({ value: c.id, label: c.name })),
  ];
  const noun = kind === "income" ? "income" : "expense";

  const onSubmit = handleSubmit(async (v) => {
    await save.mutateAsync({
      id: rule?.id,
      input: {
        kind: v.kind,
        name: v.name,
        amount: parseAmount(v.amount)!,
        account_id: v.accountId,
        category_id: v.categoryId === NONE ? null : v.categoryId,
        schedule: v.schedule,
        week_days: v.schedule === "weekly" ? v.weekDays : null,
        month_day: v.schedule === "monthly" ? Number(v.monthDay) : null,
        starts_on: toDateString(v.startsOn!),
        ends_on: v.endsOn ? toDateString(v.endsOn) : null,
      },
    });
    goBack();
  });

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
            {rule ? `Edit recurring ${noun}` : `New recurring ${noun}`}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <Segmented label="Type" options={KINDS} value={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Input
                label="Name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="Transport"
                maxLength={80}
                error={fieldState.error?.message}
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
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="accountId"
            render={({ field }) => (
              <Select label="Account" options={accountOptions} value={field.value} onChange={field.onChange} />
            )}
          />
          {formState.errors.accountId ? (
            <Text className="font-sans text-caption text-danger">{formState.errors.accountId.message}</Text>
          ) : null}
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select
                label="Category (optional)"
                options={categoryOptions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="schedule"
            render={({ field }) => (
              <View className="gap-2">
                <Text className="font-semibold text-label text-ink">Repeats</Text>
                <View className="flex-row flex-wrap gap-2">
                  {SCHEDULES.map((s) => (
                    <Chip
                      key={s.value}
                      label={s.label}
                      selected={field.value === s.value}
                      onPress={() => field.onChange(s.value)}
                    />
                  ))}
                </View>
              </View>
            )}
          />

          {schedule === "weekly" ? (
            <Controller
              control={control}
              name="weekDays"
              render={({ field, fieldState }) => (
                <View className="gap-2">
                  <Text className="font-semibold text-label text-ink">On these days</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {WEEK_DAYS.map((label, day) => (
                      <Chip
                        key={label}
                        label={label}
                        selected={field.value.includes(day)}
                        onPress={() =>
                          field.onChange(
                            field.value.includes(day) ? field.value.filter((d) => d !== day) : [...field.value, day],
                          )
                        }
                      />
                    ))}
                  </View>
                  {fieldState.error ? (
                    <Text className="font-sans text-caption text-danger">{fieldState.error.message}</Text>
                  ) : null}
                </View>
              )}
            />
          ) : null}

          {schedule === "monthly" ? (
            <Controller
              control={control}
              name="monthDay"
              render={({ field, fieldState }) => (
                <View className="gap-2">
                  <Input
                    label="Day of the month"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="31"
                    error={fieldState.error?.message}
                  />
                  <Text className="font-sans text-caption text-ink-muted">A short month uses its last day.</Text>
                </View>
              )}
            />
          ) : null}

          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="startsOn"
              render={({ field }) => (
                <DateTimeField label="Starts" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="endsOn"
              render={({ field }) => (
                <DateTimeField label="Ends (optional)" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
          </View>
          {formState.errors.endsOn ? (
            <Text className="font-sans text-caption text-danger">{formState.errors.endsOn.message}</Text>
          ) : null}

          {save.error ? <Notice tone="danger">Could not save. Check your connection.</Notice> : null}
          <Button label={`Save recurring ${noun}`} loading={formState.isSubmitting} onPress={onSubmit} />
        </KeyboardScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
