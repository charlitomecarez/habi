import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { useDiscardGuard } from "@/components/ui/DiscardGuard";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Segmented } from "@/components/ui/Segmented";
import { errorText } from "@/lib/errors";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useDeleteTodo, useSaveTodo, type Todo } from "@/lib/todos";

const REPEAT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

const PRIORITY_OPTIONS = [
  { value: 1, label: "High" },
  { value: 2, label: "Normal" },
  { value: 3, label: "Low" },
] as const;

const schema = z
  .object({
    title: z.string().trim().min(1, "Enter a title.").max(300, "Use 300 characters or fewer."),
    notes: z.string(),
    due: z.date().nullable(),
    remind: z.date().nullable(),
    repeat: z.enum(["none", "daily", "weekly", "monthly"]),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .refine((v) => v.repeat === "none" || v.due !== null || v.remind !== null, {
    message: "A repeating todo needs a due date or a reminder.",
    path: ["repeat"],
  });

type FormValues = z.infer<typeof schema>;

function defaults(todo?: Todo): FormValues {
  return {
    title: todo?.title ?? "",
    notes: todo?.notes ?? "",
    due: todo?.due_at ? new Date(todo.due_at) : null,
    remind: todo?.remind_at ? new Date(todo.remind_at) : null,
    repeat: todo?.repeat ?? "none",
    priority: todo?.priority ?? 2,
  };
}

/** Full-screen form for a new todo, or for editing one when `todo` is set. */
export function TodoForm({ todo }: { todo?: Todo }) {
  const colors = useColors();
  const save = useSaveTodo();
  const remove = useDeleteTodo();
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(todo),
  });
  const discard = useDiscardGuard(formState.isDirty, "The todo is not saved.");

  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync({
      id: todo?.id,
      input: {
        title: values.title,
        notes: values.notes.trim() || null,
        due_at: values.due?.toISOString() ?? null,
        remind_at: values.remind?.toISOString() ?? null,
        repeat: values.repeat,
        priority: values.priority,
      },
    });
    discard.allowLeave();
    goBack();
  });

  async function onDelete() {
    if (!todo) return;
    await remove.mutateAsync(todo.id);
    discard.allowLeave();
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
            {todo ? "Edit todo" : "New todo"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-3" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label="Title"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoFocus={!todo}
                maxLength={300}
              />
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Input
                label="Notes"
                optional
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="Details"
                multiline
              />
            )}
          />

          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="due"
              render={({ field }) => (
                <DateTimeField label="Due" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="remind"
              render={({ field }) => (
                <DateTimeField label="Remind me" mode="datetime" value={field.value} onChange={field.onChange} />
              )}
            />
          </View>

          <Controller
            control={control}
            name="repeat"
            render={({ field, fieldState }) => (
              <View className="gap-2">
                <Text className="font-semibold text-label text-ink">Repeat</Text>
                <Segmented label="Repeat" options={REPEAT_OPTIONS} value={field.value} onChange={field.onChange} />
                {fieldState.error ? (
                  <Text className="font-sans text-caption text-danger">{fieldState.error?.message}</Text>
                ) : null}
              </View>
            )}
          />

          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <View className="gap-2">
                <Text className="font-semibold text-label text-ink">Priority</Text>
                <View accessibilityRole="radiogroup" accessibilityLabel="Priority" className="flex-row gap-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      tone={option.value === 1 ? "danger" : "accent"}
                      selected={field.value === option.value}
                      onPress={() => field.onChange(option.value)}
                    />
                  ))}
                </View>
              </View>
            )}
          />

          {todo ? (
            <Button
              label="Delete todo"
              variant="destructive"
              size="input"
              loading={remove.isPending}
              disabled={save.isPending}
              onPress={onDelete}
            />
          ) : null}
        </KeyboardScrollView>

        <View className="gap-3 border-t-2 border-border px-5 pb-6 pt-3">
          {failure ? (
            <Text
              accessibilityRole="alert"
              className="rounded-md bg-danger-tint p-3 font-sans text-caption text-danger"
            >
              {errorText(failure)}
            </Text>
          ) : null}
          <Button
            label={todo ? "Save todo" : "Add todo"}
            loading={formState.isSubmitting}
            disabled={remove.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
      {discard.sheet}
    </SafeAreaView>
  );
}
