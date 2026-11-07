import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { dateLabel, occurrenceText, usePeople, useSavePerson } from "@/lib/people";

const UPCOMING_DAYS = 60;

export default function PeopleScreen() {
  const colors = useColors();
  const people = usePeople();
  const save = useSavePerson();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const data = people.data;
  const nameOf = (id: string) => data?.people.find((p) => p.id === id)?.name ?? "Someone";
  const upcoming = (data?.dates ?? [])
    .map((d) => ({ d, ...occurrenceText(d) }))
    .filter((x) => x.days <= UPCOMING_DAYS)
    .sort((a, b) => a.days - b.days);

  async function addPerson() {
    if (!name.trim()) return;
    const id = await save.mutateAsync({ name: name.trim(), note: note.trim() || null });
    setAdding(false);
    setName("");
    setNote("");
    router.push({ pathname: "/people/[id]", params: { id } });
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="people">
        <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
          People and dates
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-32 pt-2">
        {people.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : people.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load people. {people.error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => people.refetch()} />
          </View>
        ) : (
          <>
            <View className="gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Coming up
              </Text>
              <View className="overflow-hidden">
                {upcoming.length === 0 ? (
                  <Text className="px-4 py-3 font-sans text-caption text-ink-muted">
                    No dates in the next {UPCOMING_DAYS} days.
                  </Text>
                ) : (
                  upcoming.map(({ d, when, days }, i) => (
                    <Pressable
                      key={d.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${nameOf(d.person_id)}, ${dateLabel(d)}, ${when}`}
                      onPress={() => router.push({ pathname: "/people/[id]", params: { id: d.person_id } })}
                      className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${i === upcoming.length - 1 ? "" : "border-b-2 border-border"}`}
                    >
                      <View className="min-w-0 flex-1 gap-1">
                        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
                          {nameOf(d.person_id)} · {dateLabel(d)}
                        </Text>
                        <Text className="font-sans text-caption text-ink-muted">{when}</Text>
                      </View>
                      {days <= 7 ? <Badge label={days === 0 ? "Today" : "This week"} tone="warning" /> : null}
                    </Pressable>
                  ))
                )}
              </View>
            </View>

            <View className="gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                People
              </Text>
              <View className="overflow-hidden">
                {(data?.people ?? []).length === 0 ? (
                  <Text className="px-4 py-3 font-sans text-caption text-ink-muted">
                    Add the people whose dates you want to remember.
                  </Text>
                ) : (
                  data?.people.map((p, i) => {
                    const count = data.dates.filter((d) => d.person_id === p.id).length;
                    return (
                      <Pressable
                        key={p.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${p.name}, ${count} ${count === 1 ? "date" : "dates"}`}
                        onPress={() => router.push({ pathname: "/people/[id]", params: { id: p.id } })}
                        className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${i === data.people.length - 1 ? "" : "border-b-2 border-border"}`}
                      >
                        <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-row-title text-ink">
                          {p.name}
                        </Text>
                        <Text className="font-sans text-caption text-ink-muted">
                          {count} {count === 1 ? "date" : "dates"}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Fab label="Add person" onPress={() => setAdding(true)} />

      <Sheet visible={adding} onClose={() => setAdding(false)} title="Add person">
        <Input label="Name" value={name} onChangeText={setName} placeholder="Maria" maxLength={80} />
        <Input label="Note" optional value={note} onChangeText={setNote} placeholder="Likes coffee" />
        {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
        <Button label="Add person" loading={save.isPending} onPress={addPerson} />
      </Sheet>
    </SafeAreaView>
  );
}
