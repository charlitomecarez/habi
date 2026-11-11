import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO } from "date-fns";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { useDiscardGuard } from "@/components/ui/DiscardGuard";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { DEFAULT_REMIND_DAYS, DOCUMENT_TYPES, typeLabel, useSaveDocument, type DocumentRow } from "@/lib/documents";
import { useVehicle, vehicleName } from "@/lib/vehicles";

const REMIND_OPTIONS = [7, 14, 30, 60, 90].map((d) => ({ value: String(d), label: `${d} days before` }));
const LINK_OPTIONS = [
  { value: "yes", label: "Linked" },
  { value: "no", label: "Not linked" },
] as const;

const schema = z.object({
  type: z.enum(["lto_registration", "drivers_license", "passport", "insurance", "philhealth", "other"]),
  name: z.string().trim().min(1, "Enter a name.").max(120, "Use 120 characters or fewer."),
  number: z.string(),
  issuedOn: z.date().nullable(),
  expiresOn: z.date().nullable(),
  remindDaysBefore: z.string(),
  linkVehicle: z.enum(["yes", "no"]),
  note: z.string(),
});
type FormValues = z.infer<typeof schema>;

/** Full-screen form for a new document or for editing one. */
export function DocumentForm({ doc }: { doc?: DocumentRow }) {
  const colors = useColors();
  const save = useSaveDocument();
  const vehicle = useVehicle();
  const { control, handleSubmit, formState, setValue, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: doc?.type ?? "lto_registration",
      name: doc?.name ?? "",
      number: doc?.number ?? "",
      issuedOn: doc?.issued_on ? parseISO(doc.issued_on) : null,
      expiresOn: doc?.expires_on ? parseISO(doc.expires_on) : null,
      remindDaysBefore: String(doc?.remind_days_before ?? DEFAULT_REMIND_DAYS),
      linkVehicle: doc ? (doc.vehicle_id ? "yes" : "no") : "yes",
      note: doc?.note ?? "",
    },
  });
  const discard = useDiscardGuard(formState.isDirty, "The document is not saved.");
  const type = useWatch({ control, name: "type" });
  const v = vehicle.data;
  const remindOptions = REMIND_OPTIONS.some((o) => o.value === getValues("remindDaysBefore"))
    ? REMIND_OPTIONS
    : [
        ...REMIND_OPTIONS,
        { value: getValues("remindDaysBefore"), label: `${getValues("remindDaysBefore")} days before` },
      ];

  const onSubmit = handleSubmit(async (f) => {
    await save.mutateAsync({
      id: doc?.id,
      input: {
        type: f.type,
        name: f.name.trim(),
        number: f.number.trim() || null,
        issuedOn: f.issuedOn,
        expiresOn: f.expiresOn,
        remindDaysBefore: Number(f.remindDaysBefore),
        vehicleId: f.type === "lto_registration" && f.linkVehicle === "yes" && v ? v.id : null,
        note: f.note.trim() || null,
      },
    });
    discard.allowLeave();
    goBack();
  });

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
            {doc ? "Edit document" : "Add document"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                label="Type"
                options={DOCUMENT_TYPES}
                value={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  // Fill an empty name with the type, e.g. "Passport".
                  if (!getValues("name").trim() && next !== "other") setValue("name", typeLabel(next));
                }}
              />
            )}
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
                placeholder="Vehicle registration"
                maxLength={120}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="number"
            render={({ field }) => (
              <Input
                label="Number"
                optional
                value={field.value}
                onChangeText={field.onChange}
                autoCapitalize="characters"
              />
            )}
          />
          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="issuedOn"
              render={({ field }) => (
                <DateTimeField label="Issued (optional)" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="expiresOn"
              render={({ field }) => (
                <DateTimeField label="Expires (optional)" mode="date" value={field.value} onChange={field.onChange} />
              )}
            />
          </View>
          <Controller
            control={control}
            name="remindDaysBefore"
            render={({ field }) => (
              <Select label="Remind me" options={remindOptions} value={field.value} onChange={field.onChange} />
            )}
          />
          {type === "lto_registration" && v ? (
            <Controller
              control={control}
              name="linkVehicle"
              render={({ field }) => (
                <View className="gap-2">
                  <Text className="font-semibold text-label text-ink">Vehicle: {vehicleName(v)}</Text>
                  <Segmented
                    label={`Link to ${vehicleName(v)}`}
                    options={LINK_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </View>
              )}
            />
          ) : null}
          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <Input label="Note" optional value={field.value} onChangeText={field.onChange} multiline />
            )}
          />
          <Text className="font-sans text-caption text-ink-muted">Add photos of the document after you save it.</Text>
        </KeyboardScrollView>

        <View className="gap-3 border-t-2 border-border px-5 pb-6 pt-3">
          {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
          <Button label="Save document" loading={formState.isSubmitting} onPress={onSubmit} />
        </View>
      </KeyboardAvoidingView>
      {discard.sheet}
    </SafeAreaView>
  );
}
