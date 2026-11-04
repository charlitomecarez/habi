import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { Notice } from "@/components/ui/Notice";
import { PhotoField } from "@/components/ui/PhotoField";
import { useColors } from "@/lib/colors";
import { MOODS, useDeleteEntry, useJournal, useSaveEntry, type Mood } from "@/lib/journal";
import { usePhotoUrls, type PhotoChange } from "@/lib/photos";

export default function JournalEntryScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const colors = useColors();
  const journal = useJournal();
  const save = useSaveEntry();
  const remove = useDeleteEntry();
  const entry = journal.data?.find((e) => e.on_date === date);
  const photoUrls = usePhotoUrls([entry?.photo_path ?? null]);
  const [mood, setMood] = useState<Mood | null>(null);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<PhotoChange>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded || journal.isPending) return;
    setMood(entry?.mood ?? null);
    setBody(entry?.body ?? "");
    setLoaded(true);
  }, [loaded, journal.isPending, entry]);

  const preview =
    photo === null ? null : photo ? photo.uri : entry?.photo_path ? (photoUrls.data?.[entry.photo_path] ?? null) : null;

  async function onSave() {
    await save.mutateAsync({ date, mood, body: body.trim(), photo, currentPath: entry?.photo_path ?? null });
    router.back();
  }

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
            {format(parseISO(date), "EEEE, MMMM d")}
          </Text>
        </View>

        {!loaded ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : (
          <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
            <View className="gap-2">
              <Text className="font-semibold text-label text-ink">Mood (optional)</Text>
              <View className="flex-row flex-wrap gap-2">
                {MOODS.map((m) => (
                  <Chip key={m.value} label={m.label} selected={mood === m.value} onPress={() => setMood(mood === m.value ? null : m.value)} />
                ))}
              </View>
            </View>
            <Input label="Entry" value={body} onChangeText={setBody} multiline placeholder="What happened today?" />
            <PhotoField
              label="Photo (optional)"
              previewUri={preview}
              subject="Journal photo"
              layout="single"
              singleLabel="Add a photo"
              onPick={setPhoto}
              onRemove={() => setPhoto(null)}
            />
            {entry ? (
              <Button
                label="Delete entry"
                variant="destructive"
                size="input"
                loading={remove.isPending}
                onPress={async () => {
                  await remove.mutateAsync(entry);
                  router.back();
                }}
              />
            ) : null}
          </ScrollView>
        )}

        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {save.error ?? remove.error ? <Notice tone="danger">{(save.error ?? remove.error)!.message}</Notice> : null}
          <Button label="Save entry" loading={save.isPending} disabled={!loaded} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
