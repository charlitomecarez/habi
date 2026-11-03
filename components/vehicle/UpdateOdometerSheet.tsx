import { zodResolver } from "@hookform/resolvers/zod";
import { format, isToday, parseISO, set } from "date-fns";
import { Controller, useForm, useWatch } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";

import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import {
  formatKm,
  newlyDueAt,
  parseKm,
  useLogOdometer,
  vehicleName,
  type ServiceDue,
  type Vehicle,
} from "@/lib/vehicles";

type UpdateOdometerSheetProps = {
  visible: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  services: ServiceDue[];
  lastReading: { odometer_km: number; logged_at: string } | null;
};

function makeSchema(currentKm: number) {
  return z.object({
    reading: z
      .string()
      .refine((v) => parseKm(v) !== null, "Enter the reading in whole kilometres.")
      .refine((v) => (parseKm(v) ?? 0) > currentKm, `Enter more than ${formatKm(currentKm)} km.`),
    date: z.date({ error: "Choose a date." }).nullable().refine((d) => d !== null, "Choose a date."),
    note: z.string(),
  });
}

type FormInput = z.input<ReturnType<typeof makeSchema>>;
type FormOutput = z.output<ReturnType<typeof makeSchema>>;

export function UpdateOdometerSheet({ visible, onClose, vehicle, services, lastReading }: UpdateOdometerSheetProps) {
  const logOdometer = useLogOdometer();
  const currentKm = vehicle.current_odometer_km;
  const { control, handleSubmit, reset, formState } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(makeSchema(currentKm)),
    defaultValues: { reading: "", date: new Date(), note: "" },
  });
  const reading = parseKm(useWatch({ control, name: "reading" }) ?? "");
  const newlyDue = reading !== null && reading > currentKm ? newlyDueAt(services, reading) : [];

  const help = lastReading
    ? `Last reading: ${formatKm(lastReading.odometer_km)} km on ${format(parseISO(lastReading.logged_at), "MMM d")}. Must be higher.`
    : `Now ${formatKm(currentKm)} km. Must be higher.`;

  function close() {
    reset({ reading: "", date: new Date(), note: "" });
    logOdometer.reset();
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    const day = values.date;
    // A past day has no time on the picker; noon keeps it on that day in any time zone offset.
    const loggedAt = isToday(day) ? new Date() : set(day, { hours: 12, minutes: 0, seconds: 0 });
    await logOdometer.mutateAsync({
      vehicleId: vehicle.id,
      odometerKm: parseKm(values.reading)!,
      loggedAt,
      note: values.note.trim() || null,
    });
    close();
  });

  return (
    <Sheet visible={visible} onClose={close} title="Update odometer" subtitle={`${vehicleName(vehicle)} · ${vehicle.make} ${vehicle.model}`}>
      <Controller
        control={control}
        name="reading"
        render={({ field, fieldState }) => (
          <AmountInput
            label="Current reading"
            unit="km"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder={formatKm(currentKm)}
            help={help}
            error={fieldState.error?.message}
            autoFocus
          />
        )}
      />

      <View className="flex-row gap-3">
        <Controller
          control={control}
          name="date"
          render={({ field }) => <DateTimeField label="Date" mode="date" value={field.value} onChange={field.onChange} />}
        />
        <View className="min-w-0 flex-1">
          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <Input label="Note" optional value={field.value} onChangeText={field.onChange} placeholder="Fuel up" />
            )}
          />
        </View>
      </View>

      {newlyDue.length > 0 ? (
        <Notice tone="warning">
          Saving this makes {newlyDue.map((s) => s.item).join(", ")} due.
        </Notice>
      ) : null}
      {logOdometer.error ? <Notice tone="danger">{logOdometer.error.message}</Notice> : null}

      <Button label="Save reading" loading={formState.isSubmitting} onPress={onSubmit} />
    </Sheet>
  );
}
