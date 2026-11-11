import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { entryNeighbours, moodLabel, useJournal, type JournalEntry } from "@/lib/journal";
import { usePhotoUrls } from "@/lib/photos";

const dayText = (date: string) => format(parseISO(date), "EEE, MMM d");

/** Steps to the entry before or after this one. The screen stays, so Back still returns to the list. */
function StepLink({ entry, direction }: { entry: JournalEntry | undefined; direction: "older" | "newer" }) {
  const colors = useColors();
  if (!entry) return <View className="flex-1" />;
  const older = direction === "older";
  const label = older ? "Older" : "Newer";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} entry, ${format(parseISO(entry.on_date), "MMMM d")}`}
      onPress={() => router.setParams({ date: entry.on_date })}
      className={`min-h-touch flex-1 flex-row items-center gap-2 py-2 active:bg-surface-muted ${older ? "" : "justify-end"}`}
    >
      {older ? <Ionicons name="chevron-back" size={18} color={colors.inkMuted} /> : null}
      <View className={older ? "" : "items-end"}>
        <Text className="font-sans text-caption text-ink-muted">{label}</Text>
        <Text className="font-semibold text-label text-ink">{dayText(entry.on_date)}</Text>
      </View>
      {older ? null : <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />}
    </Pressable>
  );
}

function EntryPhoto({ path, day }: { path: string; day: string }) {
  const urls = usePhotoUrls([path]);
  const uri = urls.data?.[path];
  return (
    <View className="h-photo bg-surface-muted">
      {uri ? (
        <Image
          source={{ uri, cacheKey: path }}
          cachePolicy="disk"
          contentFit="cover"
          accessibilityLabel={`Photo from ${day}`}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
      ) : null}
    </View>
  );
}

/** One journal entry, to read. The pencil opens the form. */
export default function JournalReadScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const colors = useColors();
  const journal = useJournal();
  const entries = journal.data ?? [];
  const entry = entries.find((e) => e.on_date === date);
  const { older, newer } = entryNeighbours(entries, date);
  const mood = entry ? moodLabel(entry.mood) : null;
  const day = format(parseISO(date), "EEEE, MMMM d");
  const edited = entry && entry.updated_at.slice(0, 16) !== entry.created_at.slice(0, 16);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title={day}
        subtitle={mood ? `Feeling ${mood.toLowerCase()}` : undefined}
        tone="daily"
        backLabel="Back to Journal"
        action={
          entry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit entry"
              onPress={() => router.push({ pathname: "/journal/[date]", params: { date } })}
              className="h-touch w-touch items-center justify-center"
            >
              <Ionicons name="create-outline" size={22} color={colors.ink} />
            </Pressable>
          ) : undefined
        }
      />

      {journal.isPending ? (
        <Skeleton layout="detail" />
      ) : journal.error ? (
        <View className="gap-3 p-5">
          <Notice tone="danger">Could not load this entry. Check your connection.</Notice>
          <Button label="Try again" variant="secondary" size="input" onPress={() => journal.refetch()} />
        </View>
      ) : !entry ? (
        <Text className="p-5 font-sans text-body text-ink-muted">This entry no longer exists.</Text>
      ) : (
        <ScrollView contentContainerClassName="pb-8">
          {entry.photo_path ? <EntryPhoto path={entry.photo_path} day={day} /> : null}
          <View className="gap-5 px-5 pt-4">
            <Text selectable className="font-sans text-body text-ink">
              {entry.body || "No words for this day."}
            </Text>
            {edited ? (
              <Text className="font-sans text-caption text-ink-muted">
                Edited {format(parseISO(entry.updated_at), "MMM d, h:mm a")}
              </Text>
            ) : null}
            {older || newer ? (
              <View className="flex-row gap-3 border-t-2 border-border pt-2">
                <StepLink entry={older} direction="older" />
                <StepLink entry={newer} direction="newer" />
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
