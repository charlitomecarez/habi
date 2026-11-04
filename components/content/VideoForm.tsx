import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { useColors } from "@/lib/colors";
import { useSaveVideo, type Video } from "@/lib/content";
import { PLATFORMS, type StageId } from "@/lib/content/stages";

const FORMAT_OPTIONS = [
  { value: "long", label: "Long video" },
  { value: "short", label: "Short" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "0", label: "Low" },
  { value: "1", label: "Normal" },
  { value: "2", label: "High" },
] as const;

const schema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200, "Use 200 characters or fewer."),
  format: z.enum(["long", "short"]),
  platforms: z.array(z.string()),
  publishOn: z.date().nullable(),
  priority: z.enum(["0", "1", "2"]),
  hook: z.string(),
  projectSlug: z.string().regex(/^[\w.-]*$/, "Use the folder name only, for example 2026-11-02-my-video."),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

function defaults(video?: Video): FormValues {
  return {
    title: video?.title ?? "",
    format: video?.format ?? "long",
    platforms: video?.platforms ?? ["youtube"],
    publishOn: video?.publish_on ? parseISO(video.publish_on) : null,
    priority: String(video?.priority ?? 1) as FormValues["priority"],
    hook: video?.hook ?? "",
    projectSlug: video?.project_slug ?? "",
    notes: video?.notes ?? "",
  };
}

/** Full-screen form for a new video (starts in `stage`, Script by default) or for editing one. */
export function VideoForm({ video, stage = "script" }: { video?: Video; stage?: StageId }) {
  const colors = useColors();
  const save = useSaveVideo();
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(video),
  });

  const onSubmit = handleSubmit(async (values) => {
    const input = {
      title: values.title.trim(),
      format: values.format,
      platforms: values.platforms,
      publish_on: values.publishOn ? format(values.publishOn, "yyyy-MM-dd") : null,
      priority: Number(values.priority),
      hook: values.hook.trim(),
      project_slug: values.projectSlug.trim(),
      notes: values.notes.trim(),
    };
    const id = await save.mutateAsync({ id: video?.id, input: video ? input : { ...input, stage } });
    if (video) router.back();
    else router.replace({ pathname: "/content/video/[id]", params: { id } });
  });

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <KeyboardAvoidingView className="flex-1">
        <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" className="font-bold text-title text-ink">
            {video ? "Edit video" : stage === "idea" ? "Add idea" : "Add video"}
          </Text>
        </View>

        <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label="Title"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="How I fixed my ADV 160 idle"
                maxLength={200}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="format"
            render={({ field }) => (
              <View className="gap-2">
                <Text className="font-semibold text-label text-ink">Format</Text>
                <Segmented label="Format" options={FORMAT_OPTIONS} value={field.value} onChange={field.onChange} />
              </View>
            )}
          />

          <Controller
            control={control}
            name="platforms"
            render={({ field }) => (
              <View className="gap-2">
                <Text className="font-semibold text-label text-ink">Platforms</Text>
                <View className="flex-row flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const on = field.value.includes(p.id);
                    return (
                      <Chip
                        key={p.id}
                        label={p.label}
                        selected={on}
                        onPress={() =>
                          field.onChange(on ? field.value.filter((x) => x !== p.id) : [...field.value, p.id])
                        }
                      />
                    );
                  })}
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="publishOn"
            render={({ field }) => (
              <View className="gap-2">
                <DateTimeField
                  label="Publish date (optional)"
                  mode="date"
                  value={field.value}
                  onChange={field.onChange}
                />
                <Text className="font-sans text-caption text-ink-muted">You get a reminder at 9:00 AM that day.</Text>
              </View>
            )}
          />

          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <View className="gap-2">
                <Text className="font-semibold text-label text-ink">Priority</Text>
                <Segmented label="Priority" options={PRIORITY_OPTIONS} value={field.value} onChange={field.onChange} />
              </View>
            )}
          />

          <Controller
            control={control}
            name="hook"
            render={({ field }) => (
              <Input
                label="Hook"
                optional
                value={field.value}
                onChangeText={field.onChange}
                placeholder="The one line that makes people stay"
                multiline
              />
            )}
          />

          <Controller
            control={control}
            name="projectSlug"
            render={({ field, fieldState }) => (
              <Input
                label="Project folder"
                optional
                value={field.value}
                onChangeText={field.onChange}
                placeholder="2026-11-02-my-video"
                autoCapitalize="none"
                autoCorrect={false}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Input label="Notes" optional value={field.value} onChangeText={field.onChange} multiline />
            )}
          />
        </ScrollView>

        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
          <Button
            label={video ? "Save video" : stage === "idea" ? "Save idea" : "Add video"}
            loading={formState.isSubmitting}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
