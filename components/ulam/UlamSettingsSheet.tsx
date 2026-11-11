import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useSaveUserSettings } from "@/lib/settings";

const MIN_LIMIT = 20;
const MAX_LIMIT = 99;

const schema = z.object({
  limit: z.string().refine((v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= MIN_LIMIT && n <= MAX_LIMIT;
  }, `Enter a whole number from ${MIN_LIMIT} to ${MAX_LIMIT}.`),
  avoid: z.string().max(200, "Use 200 characters or fewer."),
});
type FormValues = z.infer<typeof schema>;

type Props = { visible: boolean; onClose: () => void; limit: number; avoid: readonly string[] };

/** The price limit and the food you never eat. Both apply from tomorrow's ulam. */
export function UlamSettingsSheet({ visible, onClose, limit, avoid }: Props) {
  const save = useSaveUserSettings();
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { limit: String(limit), avoid: avoid.join(", ") },
  });

  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync({
      ulamLimit: Number(values.limit),
      ulamAvoid: values.avoid
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    });
    onClose();
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Ulam settings"
      subtitle="These apply from tomorrow's ulam."
      footer={
        <>
          {save.error ? <ErrorNotice error={save.error} /> : null}
          <Button label="Save settings" loading={save.isPending} onPress={onSubmit} />
        </>
      }
    >
      <View className="gap-4 px-5 pb-5 pt-3">
        <Controller
          control={control}
          name="limit"
          render={({ field }) => (
            <Input
              label="Most one ulam can cost, in pesos"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.limit?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="avoid"
          render={({ field }) => (
            <Input
              label="Food you never eat"
              optional
              placeholder="Shrimp, liver"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.avoid?.message}
            />
          )}
        />
      </View>
    </Sheet>
  );
}
