import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DashedButton } from "@/components/ui/DashedButton";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { WEEKDAYS } from "@/lib/calendar";
import { useColors } from "@/lib/colors";
import { useArchivePlan, useSavePlan, type Exercise, type Plan } from "@/lib/gym";
import { REMIND_TIMES } from "@/lib/habits";

const NONE = "none";
const TIME_OPTIONS = [{ value: NONE, label: "No reminder" }, ...REMIND_TIMES];

type Row = { key: string; id?: string; name: string; sets: string; reps: string; weight: string };

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const colors = useColors();
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text className="font-medium text-badge text-ink-muted">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        inputMode="decimal"
        keyboardType="decimal-pad"
        placeholderTextColor={colors.inkMuted}
        className="h-input rounded-input border border-border-input bg-surface-card px-3 font-sans text-body text-ink"
      />
    </View>
  );
}

/** Full-screen form for a workout day: its name, its weekdays, the reminder and its exercises. */
export function PlanForm({ plan, exercises = [] }: { plan?: Plan; exercises?: Exercise[] }) {
  const colors = useColors();
  const save = useSavePlan();
  const archive = useArchivePlan();
  const [name, setName] = useState(plan?.name ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(plan?.weekdays ?? [1, 3, 5]);
  const [remind, setRemind] = useState(plan?.remind_time?.slice(0, 5) ?? (plan ? NONE : "17:00"));
  const [rows, setRows] = useState<Row[]>(
    exercises.length
      ? exercises.map((e) => ({
          key: e.id,
          id: e.id,
          name: e.name,
          sets: String(e.sets),
          reps: String(e.reps),
          weight: e.weight_kg ? String(e.weight_kg) : "",
        }))
      : [{ key: "new-0", name: "", sets: "3", reps: "10", weight: "" }],
  );
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, patch: Partial<Row>) =>
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function onSave() {
    if (!name.trim()) return setError("Name the workout day, for example Upper body.");
    if (weekdays.length === 0) return setError("Pick at least one day.");
    const list = rows.filter((r) => r.name.trim());
    for (const r of list) {
      const sets = Number(r.sets);
      const reps = Number(r.reps);
      if (!(sets >= 1 && sets <= 20)) return setError(`${r.name}: sets must be 1 to 20.`);
      if (!(reps >= 1 && reps <= 200)) return setError(`${r.name}: reps must be 1 to 200.`);
      if (r.weight.trim() && !(Number(r.weight) >= 0))
        return setError(`${r.name}: enter the weight in kg, or leave it empty.`);
    }
    const keptIds = new Set(list.map((r) => r.id).filter(Boolean));
    const removedIds = exercises.map((e) => e.id).filter((eid) => !keptIds.has(eid));
    await save.mutateAsync({
      id: plan?.id,
      removedIds,
      input: {
        name: name.trim(),
        weekdays,
        remindTime: remind === NONE ? null : remind,
        exercises: list.map((r) => ({
          id: r.id,
          name: r.name.trim(),
          sets: Number(r.sets),
          reps: Number(r.reps),
          weightKg: r.weight.trim() ? Number(r.weight) : null,
        })),
      },
    });
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
            {plan ? "Edit workout day" : "Add workout day"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Input label="Name" value={name} onChangeText={setName} placeholder="Upper body" maxLength={80} />
          <View className="gap-2">
            <Text className="font-semibold text-label text-ink">Days</Text>
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => {
                const on = weekdays.includes(i);
                return (
                  <Chip
                    key={d.long}
                    label={d.long.slice(0, 3)}
                    selected={on}
                    onPress={() => setWeekdays(on ? weekdays.filter((x) => x !== i) : [...weekdays, i].sort())}
                  />
                );
              })}
            </View>
          </View>
          <Select label="Remind me on gym days" options={TIME_OPTIONS} value={remind} onChange={setRemind} />

          <View className="gap-3">
            <Text className="font-semibold text-label text-ink">Exercises</Text>
            {rows.map((r, i) => (
              <View key={r.key} className="gap-3 rounded-card border border-border bg-surface-card p-3">
                <View className="flex-row items-end gap-2">
                  <View className="min-w-0 flex-1">
                    <Input
                      label={`Exercise ${i + 1}`}
                      value={r.name}
                      onChangeText={(v) => update(r.key, { name: v })}
                      placeholder="Bench press"
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${r.name || `exercise ${i + 1}`}`}
                    onPress={() => setRows(rows.filter((x) => x.key !== r.key))}
                    className="h-input w-touch items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
                <View className="flex-row gap-2">
                  <NumberField label="Sets" value={r.sets} onChange={(v) => update(r.key, { sets: v })} />
                  <NumberField label="Reps" value={r.reps} onChange={(v) => update(r.key, { reps: v })} />
                  <NumberField
                    label="Weight kg (optional)"
                    value={r.weight}
                    onChange={(v) => update(r.key, { weight: v })}
                  />
                </View>
              </View>
            ))}
            <DashedButton
              label="Add exercise"
              icon="add"
              onPress={() =>
                setRows([...rows, { key: `new-${Date.now()}`, name: "", sets: "3", reps: "10", weight: "" }])
              }
            />
          </View>

          {plan ? (
            <Button
              label="Archive workout day"
              variant="destructive"
              size="input"
              loading={archive.isPending}
              onPress={async () => {
                await archive.mutateAsync(plan.id);
                router.back();
              }}
            />
          ) : null}
        </KeyboardScrollView>

        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {error || save.error ? <Notice tone="danger">{error ?? save.error?.message}</Notice> : null}
          <Button label="Save workout day" loading={save.isPending} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
