import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Fab } from "@/components/ui/Fab";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { dateLabel, occurrenceText, usePeople, useSavePerson } from "@/lib/people";

const UPCOMING_DAYS = 60;

export default function PeopleScreen() {
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
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          People and dates
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-fab-clear pt-2">
        {people.isPending ? (
          <Skeleton />
        ) : people.error ? (
          <View className="gap-3">
            <ErrorNotice lead="Could not load people." error={people.error} />
            <Button label="Try again" variant="secondary" size="input" onPress={() => people.refetch()} />
          </View>
        ) : (
          <>
            <View className="gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Coming up
              </Text>
              <View>
                {upcoming.length === 0 ? (
                  <Text className="py-3 font-sans text-caption text-ink-muted">
                    No dates in the next {UPCOMING_DAYS} days.
                  </Text>
                ) : (
                  upcoming.map(({ d, when, days }, i) => (
                    <DataRow
                      key={d.id}
                      title={`${nameOf(d.person_id)} · ${dateLabel(d)}`}
                      detail={when}
                      status={
                        days === 0
                          ? { label: "Today", tone: "over" }
                          : days <= 7
                            ? { label: "This week", tone: "watch" }
                            : undefined
                      }
                      onPress={() => router.push({ pathname: "/people/[id]", params: { id: d.person_id } })}
                      last={i === upcoming.length - 1}
                    />
                  ))
                )}
              </View>
            </View>

            <View className="gap-2">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                People
              </Text>
              <View>
                {(data?.people ?? []).length === 0 ? (
                  <Text className="py-3 font-sans text-caption text-ink-muted">
                    Add the people whose dates you want to remember.
                  </Text>
                ) : (
                  data?.people.map((p, i) => {
                    const count = data.dates.filter((d) => d.person_id === p.id).length;
                    return (
                      <DataRow
                        key={p.id}
                        title={p.name}
                        detail={`${count} ${count === 1 ? "date" : "dates"}`}
                        onPress={() => router.push({ pathname: "/people/[id]", params: { id: p.id } })}
                        last={i === data.people.length - 1}
                      />
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
        {save.error ? <ErrorNotice error={save.error} /> : null}
        <Button label="Add person" loading={save.isPending} onPress={addPerson} />
      </Sheet>
    </SafeAreaView>
  );
}
