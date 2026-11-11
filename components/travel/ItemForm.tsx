import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, parseISO } from "date-fns";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Linking, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { MarkPaidSheet } from "@/components/travel/MarkPaidSheet";
import { usePlaceSuggestions } from "@/components/travel/usePlaceSuggestions";
import { DataRow } from "@/components/ui/DataRow";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { useDiscardGuard } from "@/components/ui/DiscardGuard";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useDocuments } from "@/lib/documents";
import { amountText, CURRENCIES, parseAmount, toDateString, useExchangeRates } from "@/lib/money";
import {
  KIND_OPTIONS,
  mapLink,
  useDeleteTripItem,
  useSaveTripItem,
  type TripItem,
  type TripItemKind,
} from "@/lib/travel";

const schema = z.object({
  kind: z.enum(["go", "stay", "eat", "transport", "other"]),
  title: z.string().trim().min(1, "Enter what this is.").max(120, "Use 120 characters or fewer."),
  day: z.date().nullable(),
  time: z.date().nullable(),
  place: z.string(),
  mapUrl: z
    .string()
    .refine((v) => !v.trim() || /^https?:\/\//i.test(v.trim()), "Paste a link that starts with https://"),
  cost: z.string().refine((v) => !v.trim() || parseAmount(v) !== null, "Enter an amount, such as 900."),
  currency: z.string(),
  bookingRef: z.string(),
  note: z.string(),
  documentId: z.string().nullable(),
});
type FormValues = z.infer<typeof schema>;

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c as string, label: c }));

type ItemFormProps = { tripId: string; item?: TripItem; day?: string };

/** Full-screen form for a trip item. With no day, the item waits in Ideas. */
export function ItemForm({ tripId, item, day }: ItemFormProps) {
  const colors = useColors();
  const save = useSaveTripItem();
  const remove = useDeleteTripItem();
  const documents = useDocuments();
  const rates = useExchangeRates();
  const [paying, setPaying] = useState(false);
  const startDay = item?.day ?? day;
  const places = usePlaceSuggestions();
  const { control, handleSubmit, formState, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: item?.kind ?? "go",
      title: item?.title ?? "",
      day: startDay ? parseISO(startDay) : null,
      time: item?.start_time ? parse(item.start_time.slice(0, 5), "HH:mm", new Date()) : null,
      place: item?.place ?? "",
      mapUrl: item?.map_url ?? "",
      cost: amountText(item?.cost),
      currency: item?.currency ?? "PHP",
      bookingRef: item?.booking_ref ?? "",
      note: item?.note ?? "",
      documentId: item?.document_id ?? null,
    },
  });
  const discard = useDiscardGuard(formState.isDirty, "The plan item is not saved.");

  const onSubmit = handleSubmit(async (v) => {
    await save.mutateAsync({
      id: item?.id,
      input: {
        trip_id: tripId,
        kind: v.kind as TripItemKind,
        title: v.title.trim(),
        day: v.day ? toDateString(v.day) : null,
        start_time: v.time ? format(v.time, "HH:mm") : null,
        place: v.place.trim() || null,
        map_url: v.mapUrl.trim() || null,
        cost: v.cost.trim() ? parseAmount(v.cost) : null,
        currency: v.currency,
        booking_ref: v.bookingRef.trim() || null,
        note: v.note.trim() || null,
        document_id: v.documentId,
      },
    });
    discard.allowLeave();
    goBack();
  });

  const link = item ? mapLink(item) : null;
  const rate = item && item.currency !== "PHP" ? rates.data?.find((r) => r.currency === item.currency) : null;
  const costPhp =
    item?.cost == null ? null : item.currency === "PHP" ? item.cost : rate ? item.cost * rate.rateToPhp : null;

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
            {item ? "Edit plan" : "Add to plan"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <View className="flex-row flex-wrap gap-2">
                {KIND_OPTIONS.map((k) => (
                  <Chip
                    key={k.value}
                    label={k.label}
                    selected={field.value === k.value}
                    onPress={() => field.onChange(k.value)}
                  />
                ))}
              </View>
            )}
          />
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label="What"
                placeholder="Bus to Baguio"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={120}
                error={fieldState.error?.message}
              />
            )}
          />
          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="day"
              render={({ field }) => (
                <DateTimeField label="Day (optional)" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="time"
              render={({ field }) => (
                <DateTimeField label="Time (optional)" mode="time" value={field.value} onChange={field.onChange} />
              )}
            />
          </View>
          <Text className="font-sans text-caption text-ink-muted">
            With no day, it waits in Ideas. With a day and a time, you get a reminder one hour before.
          </Text>
          <Controller
            control={control}
            name="place"
            render={({ field }) => (
              <View className="gap-1">
                <Input
                  label="Place"
                  optional
                  value={field.value}
                  onChangeText={(text) => {
                    field.onChange(text);
                    places.onType(text);
                  }}
                  onBlur={() => setTimeout(places.clear, 200)}
                />
                {places.suggestions.length > 0 ? (
                  <View accessibilityLabel="Place suggestions" className="rounded-input border-2 border-border px-3">
                    {places.suggestions.map((p, index, list) => (
                      <DataRow
                        key={`${p.name}-${p.mapUrl}`}
                        title={p.name}
                        detail={p.detail || undefined}
                        onPress={() => {
                          setValue("place", p.name, { shouldDirty: true });
                          setValue("mapUrl", p.mapUrl, { shouldDirty: true, shouldValidate: true });
                          places.clear();
                        }}
                        last={index === list.length - 1}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          />
          <Controller
            control={control}
            name="mapUrl"
            render={({ field, fieldState }) => (
              <Input
                label="Map link"
                optional
                autoCapitalize="none"
                keyboardType="url"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={control}
                name="cost"
                render={({ field, fieldState }) => (
                  <Input
                    label="Cost"
                    optional
                    keyboardType="decimal-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
            <View className="w-field-sm">
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select label="Currency" options={CURRENCY_OPTIONS} value={field.value} onChange={field.onChange} />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="bookingRef"
            render={({ field }) => (
              <Input label="Booking reference" optional value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="documentId"
            render={({ field }) => (
              <Select
                label="Ticket or booking in Documents"
                optional
                options={(documents.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
                value={field.value}
                onChange={field.onChange}
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

          {item ? (
            <View className="gap-3">
              {link ? (
                <Button
                  label="Open in Maps"
                  variant="secondary"
                  size="input"
                  onPress={() => {
                    Linking.openURL(link).catch(() => undefined);
                  }}
                />
              ) : null}
              {item.transaction_id ? (
                <Text className="font-sans text-caption text-ink-muted">Paid. The expense is in Money.</Text>
              ) : costPhp !== null ? (
                <Button label="Mark as paid" variant="secondary" size="input" onPress={() => setPaying(true)} />
              ) : null}
              <Button
                label="Delete from plan"
                variant="destructive"
                size="input"
                loading={remove.isPending}
                onPress={async () => {
                  await remove.mutateAsync(item.id);
                  discard.allowLeave();
                  goBack();
                }}
              />
            </View>
          ) : null}
        </KeyboardScrollView>

        <View className="gap-3 border-t-2 border-border px-5 pb-6 pt-3">
          {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
          {remove.error ? <Notice tone="danger">{remove.error.message}</Notice> : null}
          <Button label="Save to plan" loading={formState.isSubmitting} onPress={onSubmit} />
        </View>
      </KeyboardAvoidingView>

      {item && costPhp !== null ? (
        <MarkPaidSheet visible={paying} onClose={() => setPaying(false)} itemId={item.id} amount={costPhp} />
      ) : null}
      {discard.sheet}
    </SafeAreaView>
  );
}
