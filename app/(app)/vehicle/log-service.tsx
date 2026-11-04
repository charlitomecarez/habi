import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { Notice } from "@/components/ui/Notice";
import { PhotoField } from "@/components/ui/PhotoField";
import { Select } from "@/components/ui/Select";
import { useColors } from "@/lib/colors";
import type { LocalPhoto } from "@/lib/photos";
import {
  parseKm,
  useLogService,
  useServiceDue,
  useVehicle,
  vehicleName,
  type ServiceDue,
  type Vehicle,
} from "@/lib/vehicles";

const OTHER = "other";

const schema = z
  .object({
    serviceId: z.string().min(1, "Choose a service."),
    otherName: z.string(),
    odometer: z.string().refine((v) => parseKm(v) !== null, "Enter the reading in whole kilometres."),
    date: z
      .date()
      .nullable()
      .refine((d) => d !== null, "Choose a date."),
    cost: z
      .string()
      .refine(
        (v) => v.trim() === "" || /^\d+(\.\d{1,2})?$/.test(v.replace(/,/g, "").trim()),
        "Enter an amount such as 450 or 450.50.",
      ),
    shop: z.string(),
    notes: z.string(),
  })
  .refine((v) => v.serviceId !== OTHER || v.otherName.trim().length > 0, {
    message: "Enter the service name.",
    path: ["otherName"],
  });

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function LogServiceForm({
  vehicle,
  services,
  serviceId,
}: {
  vehicle: Vehicle;
  services: ServiceDue[];
  serviceId?: string;
}) {
  const logService = useLogService();
  const [receipt, setReceipt] = useState<LocalPhoto | null>(null);
  const { control, handleSubmit, formState } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      serviceId: serviceId ?? "",
      otherName: "",
      odometer: String(vehicle.current_odometer_km),
      date: new Date(),
      cost: "",
      shop: "",
      notes: "",
    },
  });
  const selected = useWatch({ control, name: "serviceId" });

  const options = [
    ...services.map((s) => ({ value: s.vehicleServiceId, label: s.item })),
    { value: OTHER, label: "Other…" },
  ];

  const onSubmit = handleSubmit(async (values) => {
    const cost = values.cost.replace(/,/g, "").trim();
    await logService.mutateAsync({
      vehicleId: vehicle.id,
      service: values.serviceId === OTHER ? { newItem: values.otherName.trim() } : { id: values.serviceId },
      odometerKm: parseKm(values.odometer)!,
      servicedOn: values.date,
      cost: cost ? Number(cost) : null,
      shop: values.shop.trim() || null,
      notes: values.notes.trim() || null,
      receipt,
    });
    router.back();
  });

  return (
    <>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-3" keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="serviceId"
          render={({ field, fieldState }) => (
            <Select
              label="Service"
              options={options}
              value={field.value || null}
              onChange={field.onChange}
              placeholder="Choose a service"
              error={fieldState.error?.message}
            />
          )}
        />

        {selected === OTHER ? (
          <Controller
            control={control}
            name="otherName"
            render={({ field, fieldState }) => (
              <Input
                label="Service name"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Chain cleaning"
                error={fieldState.error?.message}
                maxLength={80}
              />
            )}
          />
        ) : null}

        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1">
            <Controller
              control={control}
              name="odometer"
              render={({ field, fieldState }) => (
                <Input
                  label="Odometer (km)"
                  value={field.value}
                  onChangeText={field.onChange}
                  inputMode="numeric"
                  keyboardType="number-pad"
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <DateTimeField label="Date" mode="date" value={field.value} onChange={field.onChange} />
            )}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1">
            <Controller
              control={control}
              name="cost"
              render={({ field, fieldState }) => (
                <Input
                  label="Cost (₱)"
                  optional
                  value={field.value}
                  onChangeText={field.onChange}
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <View className="min-w-0 flex-1">
            <Controller
              control={control}
              name="shop"
              render={({ field }) => (
                <Input label="Shop" optional value={field.value} onChangeText={field.onChange} placeholder="Where" />
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
              placeholder="Brand, parts replaced…"
              multiline
            />
          )}
        />

        <PhotoField
          label="Receipt"
          layout="single"
          singleLabel="Add receipt photo"
          previewUri={receipt?.uri ?? null}
          subject="the receipt"
          onPick={setReceipt}
          onRemove={() => setReceipt(null)}
        />
      </ScrollView>

      <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
        {logService.error ? <Notice tone="danger">{logService.error.message}</Notice> : null}
        <Button label="Save service" loading={formState.isSubmitting} onPress={onSubmit} />
      </View>
    </>
  );
}

export default function LogServiceScreen() {
  const colors = useColors();
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const vehicle = useVehicle();
  const due = useServiceDue(vehicle.data?.id);

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <KeyboardAvoidingView className="flex-1">
        <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <View>
            <Text accessibilityRole="header" className="font-bold text-title text-ink">
              Log service
            </Text>
            {vehicle.data ? (
              <Text className="font-sans text-caption text-ink-muted">
                {vehicleName(vehicle.data)} · {vehicle.data.make} {vehicle.data.model}
              </Text>
            ) : null}
          </View>
        </View>

        {vehicle.data && due.data ? (
          <LogServiceForm vehicle={vehicle.data} services={due.data} serviceId={serviceId} />
        ) : vehicle.error || due.error ? (
          <View className="px-5 pt-4">
            <Notice tone="danger">Could not load the vehicle. {(vehicle.error ?? due.error)?.message}</Notice>
          </View>
        ) : (
          <ActivityIndicator color={colors.accent} className="pt-8" />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
