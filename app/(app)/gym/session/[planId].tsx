import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import {
  formatKg,
  setsText,
  today,
  useExerciseHistory,
  useGym,
  useSessionSets,
  useToggleSet,
  type Exercise,
  type Plan,
} from "@/lib/gym";

type Editing = { exercise: Exercise; setNumber: number; reps: string; weight: string };

function LastTime({ exerciseId, sessionId }: { exerciseId: string; sessionId: string | undefined }) {
  const history = useExerciseHistory(exerciseId);
  const previous = (history.data ?? []).filter((s) => s.session_id !== sessionId);
  if (previous.length === 0) return null;
  const last = previous
    .filter((s) => s.session_id === previous[0].session_id)
    .sort((a, b) => a.set_number - b.set_number);
  return (
    <Text className="font-sans text-caption text-ink-muted">
      Last time: {last.map((s) => `${s.reps}${s.weight_kg ? ` × ${formatKg(s.weight_kg)}` : ""}`).join(", ")}
    </Text>
  );
}

export default function WorkoutScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const colors = useColors();
  const gym = useGym();
  const toggle = useToggleSet();
  const [editing, setEditing] = useState<Editing | null>(null);

  const plan = gym.data?.plans.find((p) => p.id === planId);
  const date = today();
  const session = gym.data?.sessions.find((s) => s.plan_id === planId && s.on_date === date);
  const sets = useSessionSets(session?.id);

  if (!plan) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
        {gym.isPending ? (
          <View className="w-full flex-1 self-stretch pt-4">
            <Skeleton layout="detail" />
          </View>
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{gym.error ? gym.error.message : "This workout day was archived."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={goBack} />
          </View>
        )}
      </SafeAreaView>
    );
  }
  const exercises = (gym.data?.exercises ?? []).filter((e) => e.plan_id === planId);
  const doneSet = (e: Exercise, n: number) => sets.data?.find((s) => s.exercise_id === e.id && s.set_number === n);
  const total = exercises.reduce((sum, e) => sum + e.sets, 0);
  const done = sets.data?.length ?? 0;

  function tick(p: Plan, e: Exercise, n: number, reps: number, weightKg: number | null, isDone: boolean) {
    toggle.mutate({ plan: p, date, exercise: e, setNumber: n, reps, weightKg, done: isDone });
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="daily">
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" numberOfLines={1} className="font-bold text-title text-on-shell">
            {plan.name}
          </Text>
          <Text className="font-sans text-caption text-on-shell">
            {format(new Date(), "EEEE, MMM d")} · {done} of {total} sets
          </Text>
        </View>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-2">
        {toggle.error ? <Notice tone="danger">{toggle.error.message}</Notice> : null}
        {exercises.length === 0 ? (
          <Notice tone="warning">This workout day has no exercises yet. Add them from Workout days.</Notice>
        ) : null}
        {exercises.map((e) => (
          <View key={e.id} className="gap-3 rounded-card border border-border bg-surface-card p-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${e.name}, history`}
              onPress={() => router.push({ pathname: "/gym/exercise/[id]", params: { id: e.id } })}
              className="gap-1"
            >
              <Text className="font-semibold text-heading text-ink">{e.name}</Text>
              <Text className="font-sans text-caption text-ink-muted">
                Plan: {setsText(e.sets, e.reps, e.weight_kg)}
              </Text>
              <LastTime exerciseId={e.id} sessionId={session?.id} />
            </Pressable>
            {Array.from({ length: e.sets }, (_, i) => i + 1).map((n) => {
              const s = doneSet(e, n);
              const reps = s?.reps ?? e.reps;
              const weight = s ? s.weight_kg : e.weight_kg;
              return (
                <View key={n} className="flex-row items-center gap-2">
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Set ${n}, ${reps} reps${weight ? `, ${formatKg(weight)}` : ""}`}
                    accessibilityState={{ checked: Boolean(s) }}
                    onPress={() => tick(plan, e, n, reps, weight, !s)}
                    className={`min-h-touch flex-1 flex-row items-center gap-3 rounded-input border px-3 ${s ? "border-accent bg-accent-tint" : "border-border-input"}`}
                  >
                    <Ionicons
                      name={s ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={s ? colors.accent : colors.inkMuted}
                    />
                    <Text className="font-medium text-row-title text-ink">
                      Set {n} · {reps} reps{weight ? ` · ${formatKg(weight)}` : ""}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Change reps or weight for set ${n}`}
                    onPress={() =>
                      setEditing({
                        exercise: e,
                        setNumber: n,
                        reps: String(reps),
                        weight: weight ? String(weight) : "",
                      })
                    }
                    className="h-touch w-touch items-center justify-center"
                  >
                    <Ionicons name="create-outline" size={20} color={colors.ink} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.exercise.name}, set ${editing.setNumber}` : "Set"}
        subtitle="What you did. The plan stays the same."
      >
        {editing ? (
          <>
            <Input
              label="Reps"
              value={editing.reps}
              onChangeText={(v) => setEditing({ ...editing, reps: v })}
              inputMode="numeric"
              keyboardType="number-pad"
            />
            <Input
              label="Weight in kg"
              optional
              value={editing.weight}
              onChangeText={(v) => setEditing({ ...editing, weight: v })}
              inputMode="decimal"
              keyboardType="decimal-pad"
            />
            <Button
              label="Save set"
              loading={toggle.isPending}
              onPress={() => {
                const reps = Number(editing.reps);
                if (!(reps >= 0 && reps <= 200)) return;
                const weight = editing.weight.trim() ? Number(editing.weight) : null;
                tick(plan, editing.exercise, editing.setNumber, reps, weight, true);
                setEditing(null);
              }}
            />
          </>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}
