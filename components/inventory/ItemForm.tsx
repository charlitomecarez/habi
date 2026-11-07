import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO } from "date-fns";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { AddLocationSheet } from "@/components/inventory/AddLocationSheet";
import { AmountInput } from "@/components/ui/AmountInput";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { PhotoField } from "@/components/ui/PhotoField";
import { Select } from "@/components/ui/Select";
import { Stepper } from "@/components/ui/Stepper";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useDeleteItem, useLocations, useSaveItem, warrantyText, type InventoryItem } from "@/lib/inventory";
import { amountText, parseBalance } from "@/lib/money";
import { usePhotoUrls, type PhotoChange } from "@/lib/photos";

const NO_LOCATION = "none";
/** A Location option that opens the Add location sheet instead of being chosen. */
const NEW_LOCATION = "new";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(200, "Use 200 characters or fewer."),
  locationId: z.string(),
  quantity: z.string().refine((v) => /^\d+$/.test(v.trim()), "Enter a whole number, such as 1."),
  category: z.string(),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

/** Full-screen form for a new item, or for editing one when `item` is set. */
export function ItemForm({
  item,
  defaultLocationId,
  defaultName,
}: {
  item?: InventoryItem;
  defaultLocationId?: string;
  /** Starts a new item with this name, e.g. from the shopping list. */
  defaultName?: string;
}) {
  const colors = useColors();
  const save = useSaveItem();
  const remove = useDeleteItem();
  const locations = useLocations();
  const savedPhoto = usePhotoUrls([item?.photo_path ?? null, item?.receipt_path ?? null]);
  const [photo, setPhoto] = useState<PhotoChange>(undefined);
  const [receipt, setReceipt] = useState<PhotoChange>(undefined);
  const [acquiredOn, setAcquiredOn] = useState<Date | null>(item?.acquired_on ? parseISO(item.acquired_on) : null);
  const [price, setPrice] = useState(amountText(item?.price));
  const [warrantyEndsOn, setWarrantyEndsOn] = useState<Date | null>(
    item?.warranty_ends_on ? parseISO(item.warranty_ends_on) : null,
  );
  const [priceError, setPriceError] = useState<string | null>(null);
  const [addingLocation, setAddingLocation] = useState(false);

  const { control, handleSubmit, formState, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? defaultName ?? "",
      locationId: item?.location_id ?? defaultLocationId ?? NO_LOCATION,
      quantity: String(item?.quantity ?? 1),
      category: item?.category ?? "",
      notes: item?.notes ?? "",
    },
  });
  const name = useWatch({ control, name: "name" });

  const savedUri = item?.photo_path ? (savedPhoto.data?.[item.photo_path] ?? null) : null;
  const previewUri = photo === undefined ? savedUri : (photo?.uri ?? null);

  const locationOptions = [
    { value: NO_LOCATION, label: "No location" },
    ...(locations.data ?? []).map((l) => ({ value: l.id, label: l.path })),
    { value: NEW_LOCATION, label: "+ New location…" },
  ];

  const savedReceipt = item?.receipt_path ? (savedPhoto.data?.[item.receipt_path] ?? null) : null;
  const receiptUri = receipt === undefined ? savedReceipt : (receipt?.uri ?? null);
  const warranty = item ? warrantyText(item) : null;

  const onSubmit = handleSubmit(async (values) => {
    const priceValue = price.trim() ? parseBalance(price) : null;
    if (priceValue !== null && priceValue < 0) return setPriceError("Enter the price, such as 1,299.");
    setPriceError(null);
    await save.mutateAsync({
      receipt,
      item,
      input: {
        name: values.name,
        locationId: values.locationId === NO_LOCATION ? null : values.locationId,
        quantity: Number(values.quantity.trim()),
        category: values.category.trim() || null,
        notes: values.notes.trim() || null,
        acquiredOn,
        price: priceValue,
        warrantyEndsOn,
      },
      photo,
    });
    goBack();
  });

  async function onDelete() {
    if (!item) return;
    await remove.mutateAsync(item);
    goBack();
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
            {item ? "Edit item" : "Add item"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-3" keyboardShouldPersistTaps="handled">
          <PhotoField
            label="Photo"
            previewUri={previewUri}
            subject={name || "this item"}
            onPick={setPhoto}
            onRemove={() => setPhoto(item?.photo_path ? null : undefined)}
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
                placeholder="What is it?"
                error={fieldState.error?.message}
                maxLength={200}
              />
            )}
          />

          <Controller
            control={control}
            name="locationId"
            render={({ field }) => (
              <Select
                label="Location"
                options={locationOptions}
                value={field.value}
                onChange={(value) => (value === NEW_LOCATION ? setAddingLocation(true) : field.onChange(value))}
              />
            )}
          />

          <View className="flex-row gap-3">
            <View className="min-w-0 flex-1">
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Input
                    label="Category"
                    optional
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="Moto, cables…"
                    maxLength={60}
                  />
                )}
              />
            </View>
            <View className="min-w-0 flex-1">
              <Controller
                control={control}
                name="quantity"
                render={({ field, fieldState }) => (
                  <Stepper
                    label="Quantity"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Input
                label="Notes"
                optional
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Model, serial, condition…"
                multiline
              />
            )}
          />

          <View className="gap-4">
            <View className="flex-row items-center gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Purchase and warranty
              </Text>
              {warranty ? <Badge label={warranty.text} tone={warranty.tone} /> : null}
            </View>
            <View className="flex-row gap-3">
              <DateTimeField label="Bought (optional)" mode="date" value={acquiredOn} onChange={setAcquiredOn} />
              <DateTimeField
                label="Warranty ends (optional)"
                mode="date"
                value={warrantyEndsOn}
                onChange={setWarrantyEndsOn}
              />
            </View>
            <AmountInput
              label="Price (optional)"
              unit="₱"
              unitPosition="start"
              value={price}
              onChangeText={setPrice}
              inputMode="decimal"
              keyboardType="decimal-pad"
              error={priceError ?? undefined}
            />
            <PhotoField
              label="Receipt (optional)"
              previewUri={receiptUri}
              subject={`receipt for ${name || "this item"}`}
              layout="single"
              singleLabel="Add receipt photo"
              onPick={setReceipt}
              onRemove={() => setReceipt(item?.receipt_path ? null : undefined)}
            />
            {warrantyEndsOn ? (
              <Text className="font-sans text-caption text-ink-muted">
                You get a reminder one month before the warranty ends.
              </Text>
            ) : null}
          </View>

          {item ? (
            <Button
              label="Delete item"
              variant="destructive"
              size="input"
              loading={remove.isPending}
              disabled={save.isPending}
              onPress={onDelete}
            />
          ) : null}
        </KeyboardScrollView>

        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {failure ? <Notice tone="danger">{failure.message}</Notice> : null}
          <Button label="Save item" loading={formState.isSubmitting} disabled={remove.isPending} onPress={onSubmit} />
        </View>
      </KeyboardAvoidingView>

      <AddLocationSheet
        visible={addingLocation}
        onClose={() => setAddingLocation(false)}
        locations={locations.data ?? []}
        onAdded={(id) => setValue("locationId", id)}
      />
    </SafeAreaView>
  );
}
