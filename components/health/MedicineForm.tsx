import { Ionicons } from "@expo/vector-icons";
import { parseISO } from "date-fns";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { REMIND_TIMES } from "@/lib/habits";
import { timeText, useDeleteMedicine, useSaveMedicine, type Medicine } from "@/lib/health";

/** Full-screen form for a medicine and its dose times. */
export function MedicineForm({ medicine }: { medicine?: Medicine }) {
  const colors = useColors();
  const save = useSaveMedicine();
  const remove = useDeleteMedicine();
  const [name, setName] = useState(medicine?.name ?? "");
  const [dose, setDose] = useState(medicine?.dose ?? "");
  const [times, setTimes] = useState<string[]>(medicine?.times.map((t) => t.slice(0, 5)) ?? ["08:00", "20:00"]);
  const [adding, setAdding] = useState<string | null>(null);
  const [startOn, setStartOn] = useState<Date | null>(medicine ? parseISO(medicine.start_on) : new Date());
  const [endOn, setEndOn] = useState<Date | null>(medicine?.end_on ? parseISO(medicine.end_on) : null);
  const [note, setNote] = useState(medicine?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) return setError("Enter the medicine name.");
    if (times.length === 0) return setError("Add at least one time.");
    if (!startOn) return setError("Choose the start date.");
    if (endOn && endOn < startOn) return setError("The end date is before the start date.");
    await save.mutateAsync({
      id: medicine?.id,
      input: { name: name.trim(), dose: dose.trim(), times, startOn, endOn, note: note.trim() || null },
    });
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
            {medicine ? "Edit medicine" : "Add medicine"}
          </Text>
        </View>
        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Input label="Medicine" value={name} onChangeText={setName} placeholder="Amoxicillin" maxLength={120} />
          <Input label="Dose" optional value={dose} onChangeText={setDose} placeholder="500 mg, 1 capsule" />
          <View className="gap-2">
            <Text className="font-semibold text-label text-ink">Times</Text>
            <View className="flex-row flex-wrap gap-2">
              {times.map((t) => (
                <Chip
                  key={t}
                  label={`${timeText(t)} ✕`}
                  selected
                  onPress={() => setTimes(times.filter((x) => x !== t))}
                />
              ))}
            </View>
            <Select
              label="Add a time"
              options={REMIND_TIMES.filter((o) => !times.includes(o.value))}
              value={adding}
              placeholder="Pick a time"
              onChange={(v) => {
                setTimes([...times, v].sort());
                setAdding(null);
              }}
            />
            <Text className="font-sans text-caption text-ink-muted">
              A reminder at each time, and the doses show in the daily email.
            </Text>
          </View>
          <View className="flex-row gap-3">
            <DateTimeField label="Start" mode="date" value={startOn} onChange={setStartOn} />
            <DateTimeField label="End (optional)" mode="date" value={endOn} onChange={setEndOn} />
          </View>
          <Input label="Note" optional value={note} onChangeText={setNote} multiline placeholder="Take after meals" />
          {medicine ? (
            <Button
              label="Delete medicine"
              variant="destructive"
              size="input"
              loading={remove.isPending}
              onPress={async () => {
                await remove.mutateAsync(medicine.id);
                goBack();
              }}
            />
          ) : null}
        </KeyboardScrollView>
        <View className="gap-3 border-t-2 border-border px-5 pb-6 pt-3">
          {error || save.error ? <Notice tone="danger">{error ?? save.error?.message}</Notice> : null}
          <Button label="Save medicine" loading={save.isPending} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
