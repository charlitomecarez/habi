import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO } from "date-fns";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { amountText, parseAmount } from "@/lib/money";
import { useSaveTrip, type Trip } from "@/lib/travel";

const schema = z
  .object({
    title: z.string().trim().min(1, "Enter a name for the trip.").max(120, "Use 120 characters or fewer."),
    destination: z.string(),
    startDate: z
      .date()
      .nullable()
      .refine((v) => Boolean(v), "Choose the first day."),
    endDate: z
      .date()
      .nullable()
      .refine((v) => Boolean(v), "Choose the last day."),
    budget: z.string().refine((v) => !v.trim() || parseAmount(v) !== null, "Enter an amount, such as 10,000."),
    note: z.string(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "The last day cannot be before the first day.",
  });
type FormValues = z.infer<typeof schema>;

/** Full-screen form for a new trip or for editing one. */
export function TripForm({ trip }: { trip?: Trip }) {
  const colors = useColors();
  const save = useSaveTrip();
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: trip?.title ?? "",
      destination: trip?.destination ?? "",
      startDate: trip ? parseISO(trip.start_date) : null,
      endDate: trip ? parseISO(trip.end_date) : null,
      budget: amountText(trip?.budget_php),
      note: trip?.note ?? "",
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    const id = await save.mutateAsync({
      id: trip?.id,
      input: {
        title: v.title.trim(),
        destination: v.destination.trim() || null,
        startDate: v.startDate!,
        endDate: v.endDate!,
        budget: v.budget.trim() ? parseAmount(v.budget) : null,
        note: v.note.trim() || null,
      },
    });
    if (trip) router.back();
    else router.replace({ pathname: "/travel/[id]", params: { id } });
  });

  const dateError = formState.errors.startDate?.message ?? formState.errors.endDate?.message;

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
            {trip ? "Edit trip" : "New trip"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label="Trip name"
                placeholder="Baguio"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={120}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="destination"
            render={({ field }) => (
              <Input label="Destination" optional value={field.value} onChangeText={field.onChange} />
            )}
          />
          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DateTimeField label="First day" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <DateTimeField label="Last day" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
          </View>
          {dateError ? <Text className="font-sans text-caption text-danger">{dateError}</Text> : null}
          <Controller
            control={control}
            name="budget"
            render={({ field, fieldState }) => (
              <Input
                label="Budget in pesos"
                optional
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
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
          <Button label="Save trip" loading={formState.isSubmitting} onPress={onSubmit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
