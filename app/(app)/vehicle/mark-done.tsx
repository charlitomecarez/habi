import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import {
  dueText,
  laterText,
  parseKm,
  useMarkServicesDone,
  useServiceDue,
  useVehicle,
  type ServiceDue,
  type Vehicle,
} from "@/lib/vehicles";

const schema = z.object({
  serviceIds: z.array(z.string()).min(1, "Check at least one service."),
  odometer: z.string().refine((v) => parseKm(v) !== null, "Enter the reading in whole kilometres."),
  date: z
    .date()
    .nullable()
    .refine((d) => d !== null, "Choose a date."),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function statusText(s: ServiceDue): string {
  return s.status === "overdue" || s.status === "due_soon" ? dueText(s) : laterText(s);
}

function MarkDoneForm({ vehicle, services }: { vehicle: Vehicle; services: ServiceDue[] }) {
  const colors = useColors();
  const markDone = useMarkServicesDone();
  const { control, handleSubmit, setValue, formState } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { serviceIds: [], odometer: String(vehicle.current_odometer_km), date: new Date() },
  });
  const checked = useWatch({ control, name: "serviceIds" });

  function toggle(id: string) {
    const next = checked.includes(id) ? checked.filter((c) => c !== id) : [...checked, id];
    setValue("serviceIds", next, { shouldValidate: formState.isSubmitted });
  }

  const onSubmit = handleSubmit(async (values) => {
    await markDone.mutateAsync({
      vehicleId: vehicle.id,
      serviceIds: values.serviceIds,
      odometerKm: parseKm(values.odometer)!,
      servicedOn: values.date,
    });
    goBack();
  });

  const label = checked.length === 0 ? "Mark as done" : `Mark ${checked.length} as done`;

  return (
    <>
      <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-3" keyboardShouldPersistTaps="handled">
        <Text className="font-sans text-body text-ink-muted">
          Check the services that are already done. The next due point counts from this reading and date.
        </Text>

        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1">
            <Controller
              control={control}
              name="odometer"
              render={({ field, fieldState }) => (
                <Input
                  label="Done at (km)"
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

        <View className="gap-2">
          <View>
            {services.map((s, index) => {
              const isChecked = checked.includes(s.vehicleServiceId);
              return (
                <Pressable
                  key={s.vehicleServiceId}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={`${s.item}, ${statusText(s)}`}
                  onPress={() => toggle(s.vehicleServiceId)}
                  className={`min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted ${index < services.length - 1 ? "border-b-2 border-border" : ""}`}
                >
                  <Ionicons
                    name={isChecked ? "checkbox" : "square-outline"}
                    size={22}
                    color={isChecked ? colors.accent : colors.inkMuted}
                  />
                  <View className="flex-1 gap-1">
                    <Text className="font-medium text-row-title text-ink">{s.item}</Text>
                    <Text
                      className={`font-sans text-caption ${s.status === "overdue" ? "text-danger" : "text-ink-muted"}`}
                    >
                      {statusText(s)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {formState.errors.serviceIds ? (
            <Text className="font-sans text-caption text-danger">{formState.errors.serviceIds.message}</Text>
          ) : null}
          <Text className="font-sans text-caption text-ink-muted">
            For a different reading, a cost or a shop, use Log service.
          </Text>
        </View>
      </KeyboardScrollView>

      <View className="gap-3 border-t-2 border-border px-5 pb-6 pt-3">
        {markDone.error ? <Notice tone="danger">{markDone.error.message}</Notice> : null}
        <Button label={label} loading={formState.isSubmitting} onPress={onSubmit} />
      </View>
    </>
  );
}

export default function MarkDoneScreen() {
  const vehicle = useVehicle();
  const due = useServiceDue(vehicle.data?.id);

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <KeyboardAvoidingView className="flex-1">
        <ModuleBar>
          <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
            Mark services done
          </Text>
        </ModuleBar>

        {vehicle.data && due.data ? (
          <MarkDoneForm vehicle={vehicle.data} services={due.data} />
        ) : vehicle.error || due.error ? (
          <View className="px-5 pt-4">
            <Notice tone="danger">Could not load the vehicle. {(vehicle.error ?? due.error)?.message}</Notice>
          </View>
        ) : (
          <Skeleton />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
