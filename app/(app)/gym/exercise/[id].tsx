import { format, parseISO } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatKg, useExerciseHistory, useGym } from "@/lib/gym";

/** Every session you did this exercise, newest first, so you can see reps and weight go up. */
export default function ExerciseHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gym = useGym();
  const history = useExerciseHistory(id);
  const exercise = gym.data?.exercises.find((e) => e.id === id);
  const dateOf = (sessionId: string) => gym.data?.sessions.find((s) => s.id === sessionId)?.on_date;

  const bySession: { sessionId: string; sets: { reps: number; weight_kg: number | null; set_number: number }[] }[] = [];
  for (const s of history.data ?? []) {
    const group = bySession.find((g) => g.sessionId === s.session_id);
    if (group) group.sets.push(s);
    else bySession.push({ sessionId: s.session_id, sets: [s] });
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="daily">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="min-w-0 flex-1 font-bold text-title text-on-shell"
        >
          {exercise?.name ?? "Exercise"}
        </Text>
      </ModuleBar>
      <ScrollView contentContainerClassName="gap-3 px-5 pb-8 pt-2">
        {history.isPending ? (
          <Skeleton layout="detail" />
        ) : history.error ? (
          <Notice tone="danger">Could not load the history. {history.error.message}</Notice>
        ) : bySession.length === 0 ? (
          <Text className="font-sans text-body text-ink-muted">
            No sets yet. Tick sets during a workout to build the history.
          </Text>
        ) : (
          <View>
            {bySession.map((g, i) => {
              const date = dateOf(g.sessionId);
              const best = Math.max(...g.sets.map((s) => s.weight_kg ?? 0));
              return (
                <View
                  key={g.sessionId}
                  className={`gap-1 px-4 py-3 ${i === bySession.length - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <Text className="font-semibold text-row-title text-ink">
                    {date ? format(parseISO(date), "EEE, MMM d, yyyy") : "Earlier"}
                    {best > 0 ? ` · best ${formatKg(best)}` : ""}
                  </Text>
                  <Text className="font-sans text-caption text-ink-muted">
                    {[...g.sets]
                      .sort((a, b) => a.set_number - b.set_number)
                      .map((s) => `${s.reps}${s.weight_kg ? ` × ${formatKg(s.weight_kg)}` : ""}`)
                      .join(", ")}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
