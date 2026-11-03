import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { AddLocationSheet } from "@/components/inventory/AddLocationSheet";
import { PhotoField } from "@/components/inventory/PhotoField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { colors } from "@/lib/colors";
import {
  useDeleteItem,
  useLocations,
  usePhotoUrls,
  useSaveItem,
  type InventoryItem,
  type PhotoChange,
} from "@/lib/inventory";

const NO_LOCATION = "none";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(200, "Use 200 characters or fewer."),
  locationId: z.string(),
  quantity: z.string().refine((v) => /^\d+$/.test(v.trim()), "Enter a whole number, such as 1."),
  category: z.string(),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

/** Full-screen form for a new item, or for editing one when `item` is set. */
export function ItemForm({ item, defaultLocationId }: { item?: InventoryItem; defaultLocationId?: string }) {
  const save = useSaveItem();
  const remove = useDeleteItem();
  const locations = useLocations();
  const savedPhoto = usePhotoUrls([item?.photo_path ?? null]);
  const [photo, setPhoto] = useState<PhotoChange>(undefined);
  const [addingLocation, setAddingLocation] = useState(false);

  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? "",
      locationId: item?.location_id ?? defaultLocationId ?? NO_LOCATION,
      quantity: String(item?.quantity ?? 1),
      category: item?.category ?? "",
      notes: item?.notes ?? "",
    },
  });
  const name = useWatch({ control, name: "name" });

  const savedUri = item?.photo_path ? savedPhoto.data?.[item.photo_path] ?? null : null;
  const previewUri = photo === undefined ? savedUri : photo?.uri ?? null;

  const locationOptions = [
    { value: NO_LOCATION, label: "No location" },
    ...(locations.data ?? []).map((l) => ({ value: l.id, label: l.path })),
  ];

  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync({
      item,
      input: {
        name: values.name,
        locationId: values.locationId === NO_LOCATION ? null : values.locationId,
        quantity: Number(values.quantity.trim()),
        category: values.category.trim() || null,
        notes: values.notes.trim() || null,
      },
      photo,
    });
    router.back();
  });

  async function onDelete() {
    if (!item) return;
    await remove.mutateAsync(item);
    router.back();
  }

  const failure = save.error ?? remove.error;

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
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
            {item ? "Edit item" : "Add item"}
          </Text>
        </View>

        <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-3" keyboardShouldPersistTaps="handled">
          <PhotoField
            previewUri={previewUri}
            itemName={name}
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
                placeholder="HDMI cable"
                error={fieldState.error?.message}
                maxLength={200}
              />
            )}
          />

          <View className="gap-2">
            <Controller
              control={control}
              name="locationId"
              render={({ field }) => (
                <Select label="Location" options={locationOptions} value={field.value} onChange={field.onChange} />
              )}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setAddingLocation(true)}
              className="min-h-touch flex-row items-center gap-2 self-start"
            >
              <Ionicons name="add" size={18} color={colors.accent} />
              <Text className="font-semibold text-label text-accent">Add a location</Text>
            </Pressable>
          </View>

          <View className="flex-row gap-3">
            <View className="w-amount">
              <Controller
                control={control}
                name="quantity"
                render={({ field, fieldState }) => (
                  <Input
                    label="Qty"
                    value={field.value}
                    onChangeText={field.onChange}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    error={fieldState.error?.message}
                    maxLength={5}
                  />
                )}
              />
            </View>
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
                    placeholder="Cables"
                    maxLength={60}
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
                placeholder="Brand, size, where it came from…"
                multiline
              />
            )}
          />

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
        </ScrollView>

        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {failure ? <Notice tone="danger">{failure.message}</Notice> : null}
          <Button
            label={item ? "Save item" : "Add item"}
            loading={formState.isSubmitting}
            disabled={remove.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>

      <AddLocationSheet
        visible={addingLocation}
        onClose={() => setAddingLocation(false)}
        locations={locations.data ?? []}
      />
    </SafeAreaView>
  );
}
