import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { parseAmount } from "@/lib/money";
import { useSaveUlamDay } from "@/lib/ulam";

const optionalNumber = (message: string) => z.string().refine((v) => !v.trim() || parseAmount(v) !== null, message);

const schema = z.object({
  name: z.string().trim().min(1, "Enter what you ate.").max(80, "Use 80 characters or fewer."),
  cost: optionalNumber("Enter a price, such as 45."),
  kcal: optionalNumber("Enter a number, such as 300."),
});
type FormValues = z.infer<typeof schema>;

/** Logs what you really ate on a day. */
export function MealSheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const save = useSaveUlamDay();
  const { control, handleSubmit, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", cost: "", kcal: "" },
  });

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!date) return;
    await save.mutateAsync({
      date,
      custom: {
        name: values.name,
        cost: values.cost.trim() ? parseAmount(values.cost) : null,
        kcal: values.kcal.trim() ? parseAmount(values.kcal) : null,
      },
      source: "you",
      eaten: true,
    });
    close();
  });

  return (
    <Sheet visible={date !== null} onClose={close} title="What did you eat?">
      <View className="gap-4 px-5 pb-5 pt-3">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              label="Ulam"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="cost"
          render={({ field }) => (
            <Input
              label="Price in pesos"
              optional
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.cost?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="kcal"
          render={({ field }) => (
            <Input
              label="Calories"
              optional
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.kcal?.message}
            />
          )}
        />
        {save.error ? <ErrorNotice error={save.error} /> : null}
        <Button label="Save meal" loading={save.isPending} onPress={onSubmit} />
      </View>
    </Sheet>
  );
}
