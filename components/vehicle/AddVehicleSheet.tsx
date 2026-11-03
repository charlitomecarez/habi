import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { parseKm, useAddVehicle } from "@/lib/vehicles";

const schema = z.object({
  nickname: z.string().max(40, "Use 40 characters or fewer."),
  odometer: z.string().refine((v) => parseKm(v) !== null, "Enter the reading in whole kilometres."),
});

type FormValues = z.infer<typeof schema>;

export function AddVehicleSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addVehicle = useAddVehicle();
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nickname: "", odometer: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await addVehicle.mutateAsync({
      nickname: values.nickname.trim() || null,
      odometerKm: parseKm(values.odometer)!,
    });
    onClose();
    // A used bike has services done before it was added; ask for them so they do not all show overdue.
    router.push("/vehicle/mark-done");
  });

  return (
    <Sheet visible={visible} onClose={onClose} title="Add vehicle" subtitle="Honda ADV 160 with its service schedule">
      <Controller
        control={control}
        name="odometer"
        render={({ field, fieldState }) => (
          <AmountInput
            label="Odometer reading"
            unit="km"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="0"
            error={fieldState.error?.message}
            autoFocus
          />
        )}
      />
      <Controller
        control={control}
        name="nickname"
        render={({ field, fieldState }) => (
          <Input
            label="Nickname"
            optional
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Daily"
            error={fieldState.error?.message}
          />
        )}
      />
      {addVehicle.error ? <Notice tone="danger">{addVehicle.error.message}</Notice> : null}
      <Button label="Add vehicle" loading={formState.isSubmitting} onPress={onSubmit} />
    </Sheet>
  );
}
