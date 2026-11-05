import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { Stepper } from "@/components/ui/Stepper";
import { WEEKDAYS } from "@/lib/calendar";
import { useColors } from "@/lib/colors";
import { REMIND_TIMES, SCHEDULE_OPTIONS, useSaveHabit, type Habit, type HabitSchedule } from "@/lib/habits";

const NONE = "none";
const TIME_OPTIONS = [{ value: NONE, label: "No reminder" }, ...REMIND_TIMES];

/** Full-screen form for a new habit or for editing one. */
export function HabitForm({ habit }: { habit?: Habit }) {
  const colors = useColors();
  const save = useSaveHabit();
  const [name, setName] = useState(habit?.name ?? "");
  const [schedule, setSchedule] = useState<HabitSchedule>(habit?.schedule ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(habit?.weekdays.length ? habit.weekdays : [1, 2, 3, 4, 5]);
  const [times, setTimes] = useState(String(habit?.times_per_week ?? 3));
  const [remind, setRemind] = useState(habit?.remind_time?.slice(0, 5) ?? "20:00");
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim()) return setError("Enter a name, for example Read 20 pages.");
    if (schedule === "weekdays" && weekdays.length === 0) return setError("Pick at least one day.");
    const n = Number(times);
    if (schedule === "times_per_week" && !(n >= 1 && n <= 7)) return setError("Pick 1 to 7 times a week.");
    await save.mutateAsync({
      id: habit?.id,
      input: {
        name: name.trim(),
        schedule,
        weekdays,
        timesPerWeek: schedule === "times_per_week" ? n : null,
        remindTime: remind === NONE ? null : remind,
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
            {habit ? "Edit habit" : "Add habit"}
          </Text>
        </View>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <Input label="Habit" value={name} onChangeText={setName} placeholder="Read 20 pages" maxLength={80} />
          <View className="gap-2">
            <Text className="font-semibold text-label text-ink">How often</Text>
            <Segmented label="How often" options={SCHEDULE_OPTIONS} value={schedule} onChange={setSchedule} />
          </View>
          {schedule === "weekdays" ? (
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
          ) : null}
          {schedule === "times_per_week" ? (
            <Stepper label="Times a week" value={times} onChange={setTimes} min={1} />
          ) : null}
          <Select label="Remind me" options={TIME_OPTIONS} value={remind} onChange={setRemind} />
          <Text className="font-sans text-caption text-ink-muted">
            A push notification on the days it is due, until you tick it.
          </Text>
        </KeyboardScrollView>

        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {error || save.error ? <Notice tone="danger">{error ?? save.error?.message}</Notice> : null}
          <Button label="Save habit" loading={save.isPending} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
