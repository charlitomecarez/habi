import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO } from "date-fns";
import { router } from "expo-router";
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
import { useColors } from "@/lib/colors";
import { DIRECTION_OPTIONS, useSaveDebt, type Debt, type DebtDirection } from "@/lib/debts";
import { amountText, parseAmount } from "@/lib/money";
import { usePeople } from "@/lib/people";

const schema = z.object({
  direction: z.enum(["owed_to_me", "i_owe"]),
  personName: z.string().trim().min(1, "Enter a name.").max(80, "Use 80 characters or fewer."),
  amount: z.string().refine((v) => parseAmount(v) !== null, "Enter an amount, such as 500 or 1,250.00."),
  occurredOn: z
    .date()
    .nullable()
    .refine((v) => Boolean(v), "Choose the date."),
  dueOn: z.date().nullable(),
  note: z.string(),
});
type FormValues = z.infer<typeof schema>;

/** Full-screen form for a new debt or for editing one. `person` fills the name (from People and dates). */
export function DebtForm({ debt, person, direction }: { debt?: Debt; person?: string; direction?: DebtDirection }) {
  const colors = useColors();
  const save = useSaveDebt();
  const people = usePeople();
  const { control, handleSubmit, formState, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      direction: debt?.direction ?? direction ?? "owed_to_me",
      personName: debt?.person_name ?? person ?? "",
      amount: amountText(debt?.amount),
      occurredOn: debt ? parseISO(debt.occurred_on) : new Date(),
      dueOn: debt?.due_on ? parseISO(debt.due_on) : null,
      note: debt?.note ?? "",
    },
  });

  const typed = (useWatch({ control, name: "personName" }) ?? "").trim().toLowerCase();
  const all = people.data?.people ?? [];
  const exact = all.some((p) => p.name.toLowerCase() === typed);
  const suggestions = exact ? [] : all.filter((p) => !typed || p.name.toLowerCase().includes(typed)).slice(0, 6);

  const onSubmit = handleSubmit(async (v) => {
    await save.mutateAsync({
      id: debt?.id,
      input: {
        direction: v.direction,
        personName: v.personName.trim(),
        amount: parseAmount(v.amount)!,
        occurredOn: v.occurredOn!,
        dueOn: v.dueOn,
        note: v.note.trim() || null,
      },
    });
    router.back();
  });

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
            {debt ? "Edit debt" : "Add debt"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="direction"
            render={({ field }) => (
              <Segmented label="Who owes" options={DIRECTION_OPTIONS} value={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="personName"
            render={({ field, fieldState }) => (
              <Input
                label="Person"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="Juan"
                maxLength={80}
                error={fieldState.error?.message}
              />
            )}
          />
          {suggestions.length > 0 ? (
            <View className="gap-2">
              <View className="flex-row flex-wrap gap-2">
                {suggestions.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={false}
                    onPress={() => setValue("personName", p.name, { shouldValidate: true })}
                  />
                ))}
              </View>
              <Text className="font-sans text-caption text-ink-muted">
                Pick someone from People and dates, or type a new name to add them.
              </Text>
            </View>
          ) : null}
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
                inputMode="decimal"
                keyboardType="decimal-pad"
                placeholder="0.00"
                error={fieldState.error?.message}
              />
            )}
          />
          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="occurredOn"
              render={({ field }) => (
                <DateTimeField label="Date" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="dueOn"
              render={({ field }) => (
                <DateTimeField label="Due (optional)" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
          </View>
          {formState.errors.occurredOn ? (
            <Text className="font-sans text-caption text-danger">{formState.errors.occurredOn.message}</Text>
          ) : null}
          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <Input label="Note" optional value={field.value} onChangeText={field.onChange} multiline />
            )}
          />
        </KeyboardScrollView>

        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
          <Button label="Save debt" loading={formState.isSubmitting} onPress={onSubmit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
