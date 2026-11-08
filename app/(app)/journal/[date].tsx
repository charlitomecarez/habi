import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { PhotoField } from "@/components/ui/PhotoField";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { MOODS, useDeleteEntry, useJournal, useSaveEntry, type JournalEntry, type Mood } from "@/lib/journal";
import { usePhotoUrls, type PhotoChange } from "@/lib/photos";

/** The entry box starts tall, so a long entry stays readable while you edit. */
const ENTRY_LINES = 8;

export default function JournalEntryScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const journal = useJournal();
  if (journal.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page">
        <View className="w-full flex-1 self-stretch pt-4">
          <Skeleton layout="detail" />
        </View>
      </SafeAreaView>
    );
  }
  // Mounted once the entries load, so the editor starts from the saved entry.
  return <EntryEditor key={date} date={date} entry={journal.data?.find((e) => e.on_date === date)} />;
}

function EntryEditor({ date, entry }: { date: string; entry: JournalEntry | undefined }) {
  const colors = useColors();
  const save = useSaveEntry();
  const remove = useDeleteEntry();
  const photoUrls = usePhotoUrls([entry?.photo_path ?? null]);
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null);
  const [body, setBody] = useState(entry?.body ?? "");
  const [photo, setPhoto] = useState<PhotoChange>(undefined);

  const preview =
    photo === null ? null : photo ? photo.uri : entry?.photo_path ? (photoUrls.data?.[entry.photo_path] ?? null) : null;

  async function onSave() {
    await save.mutateAsync({ date, mood, body: body.trim(), photo, currentPath: entry?.photo_path ?? null });
    goBack();
  }

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
            {format(parseISO(date), "EEEE, MMMM d")}
          </Text>
        </View>

        {
          <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
            <View className="gap-2">
              <Text className="font-semibold text-label text-ink">Mood (optional)</Text>
              <View className="flex-row flex-wrap gap-2">
                {MOODS.map((m) => (
                  <Chip
                    key={m.value}
                    label={m.label}
                    selected={mood === m.value}
                    onPress={() => setMood(mood === m.value ? null : m.value)}
                  />
                ))}
              </View>
            </View>
            <Input
              label="Entry"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={ENTRY_LINES}
              placeholder="What happened today?"
            />
            <PhotoField
              label="Photo"
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
                  router.dismissTo("/journal");
                }}
              />
            ) : null}
          </KeyboardScrollView>
        }

        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {(save.error ?? remove.error) ? <Notice tone="danger">{(save.error ?? remove.error)!.message}</Notice> : null}
          <Button label="Save entry" loading={save.isPending} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
