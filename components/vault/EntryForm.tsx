import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { generatePassword, passwordStrength, type Strength } from "@/lib/password";
import {
  useDeleteVaultEntry,
  useSaveVaultEntry,
  type VaultEntry,
  type VaultEntryData,
  noteVaultActivity,
} from "@/lib/vault";

const schema = z.object({
  title: z.string().trim().min(1, "Enter a name, such as GitHub."),
  username: z.string(),
  password: z.string(),
  url: z.string(),
  notes: z.string(),
});

const EMPTY: VaultEntryData = { title: "", username: "", password: "", url: "", notes: "" };

const BARS = [1, 2, 3, 4] as const;

/** Four bars and a word. The word carries the meaning; the colour only repeats it. */
function StrengthMeter({ strength }: { strength: Strength }) {
  const fill = strength.score >= 3 ? "bg-accent" : strength.score === 2 ? "bg-warning" : "bg-danger";
  const text = strength.score >= 3 ? "text-accent-strong" : strength.score === 2 ? "text-warning" : "text-danger";
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row gap-1" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {BARS.map((bar) => (
          <View key={bar} className={`h-1 w-5 rounded-pill ${bar <= strength.score ? fill : "bg-divider"}`} />
        ))}
      </View>
      <Text className={`font-semibold text-caption ${text}`}>{strength.label}</Text>
    </View>
  );
}

/** Full-screen form for a login. Edits one when `entry` is set. */
export function EntryForm({ entry }: { entry?: VaultEntry }) {
  const colors = useColors();
  const save = useSaveVaultEntry();
  const remove = useDeleteVaultEntry();

  const { control, handleSubmit, formState, setValue } = useForm<VaultEntryData>({
    resolver: zodResolver(schema),
    defaultValues: entry?.data ?? EMPTY,
  });

  // Typing counts as activity, so the vault does not lock while you fill in the form.
  const typed = useWatch({ control });
  useEffect(() => noteVaultActivity(), [typed]);

  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync({
      id: entry?.id,
      data: {
        title: values.title.trim(),
        username: values.username.trim(),
        password: values.password,
        url: values.url.trim(),
        notes: values.notes.trim(),
      },
    });
    goBack();
  });

  async function onGenerate() {
    setValue("password", await generatePassword(), { shouldDirty: true });
  }

  async function onDelete() {
    if (!entry) return;
    await remove.mutateAsync(entry.id);
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
            {entry ? "Edit login" : "Add login"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-3" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label="Name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="e.g. GitHub"
                maxLength={120}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="url"
            render={({ field }) => (
              <Input
                label="Website"
                optional
                value={field.value}
                onChangeText={field.onChange}
                placeholder="https://"
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="url"
                keyboardType="url"
              />
            )}
          />
          <Controller
            control={control}
            name="username"
            render={({ field }) => (
              <Input
                label="Username or email"
                optional
                value={field.value}
                onChangeText={field.onChange}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <View className="gap-2">
                <PasswordInput
                  label="Password"
                  optional
                  value={field.value}
                  onChangeText={field.onChange}
                  textContentType="password"
                />
                <View className="flex-row items-center justify-between">
                  {field.value ? <StrengthMeter strength={passwordStrength(field.value)} /> : <View />}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Generate a strong password"
                    onPress={onGenerate}
                    className="h-touch flex-row items-center gap-2 px-3"
                  >
                    <Ionicons name="refresh" size={16} color={colors.accent} />
                    <Text className="font-semibold text-label text-accent">Generate</Text>
                  </Pressable>
                </View>
              </View>
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
                placeholder="Recovery codes, PIN hints…"
                multiline
              />
            )}
          />

          {entry ? (
            <Button
              label="Delete login"
              variant="destructive"
              size="input"
              loading={remove.isPending}
              disabled={save.isPending}
              onPress={onDelete}
            />
          ) : null}
        </KeyboardScrollView>

        <View className="gap-3 border-t-2 border-border px-5 pb-6 pt-3">
          {failure ? <Notice tone="danger">{failure.message}</Notice> : null}
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="lock-closed-outline" size={14} color={colors.inkMuted} />
            <Text className="font-sans text-badge text-ink-muted">Encrypted on this phone before it&apos;s saved</Text>
          </View>
          <Button label="Save login" loading={formState.isSubmitting} disabled={remove.isPending} onPress={onSubmit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
