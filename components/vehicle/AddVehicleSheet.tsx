import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import type { SheetOption } from "@/components/ui/OptionSheet";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { modelLabel, parseKm, useAddVehicle, useVehicleModels } from "@/lib/vehicles";

/** The row that says other models are coming. It is off, so it can never be picked. */
const ANOTHER = "another";

const schema = z.object({
  nickname: z.string().max(40, "Use 40 characters or fewer."),
  odometer: z.string().refine((v) => parseKm(v) !== null, "Enter the reading in whole kilometres."),
});

type FormValues = z.infer<typeof schema>;

export function AddVehicleSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addVehicle = useAddVehicle();
  const models = useVehicleModels();
  // Null until you pick: the default model, once the list loads.
  const [picked, setPicked] = useState<string | null>(null);
  const modelId = picked ?? models.data?.find((m) => m.isDefault)?.id ?? models.data?.[0]?.id ?? null;
  const model = models.data?.find((m) => m.id === modelId) ?? null;

  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nickname: "", odometer: "" },
  });

  const options: SheetOption<string>[] = [
    ...(models.data ?? []).map((m) => ({ value: m.id, label: modelLabel(m), detail: "Service schedule ready" })),
    {
      value: ANOTHER,
      label: "Another model",
      detail: "Under development. Only the Honda ADV 160 has a service schedule now.",
      disabled: true,
    },
  ];

  const onSubmit = handleSubmit(async (values) => {
    if (!model) return;
    await addVehicle.mutateAsync({
      model,
      nickname: values.nickname.trim() || null,
      odometerKm: parseKm(values.odometer)!,
    });
    onClose();
    // A used bike has services done before it was added; ask for them so they do not all show overdue.
    router.push("/vehicle/mark-done");
  });

  return (
    <Sheet visible={visible} onClose={onClose} title="Add vehicle" subtitle="Your vehicle, with its service schedule">
      <Select
        label="Model"
        options={options}
        value={modelId}
        onChange={setPicked}
        placeholder={models.isPending ? "Loading…" : "Choose"}
      />
      {models.error ? <Notice tone="danger">Could not load the models. Check your connection.</Notice> : null}
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
      {addVehicle.error ? <ErrorNotice error={addVehicle.error} /> : null}
      <Button label="Add vehicle" loading={formState.isSubmitting} disabled={!model} onPress={onSubmit} />
    </Sheet>
  );
}
