import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HabitForm } from "@/components/habits/HabitForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useHabits } from "@/lib/habits";

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const habits = useHabits();
  const habit = habits.data?.habits.find((h) => h.id === id);
  if (habit) return <HabitForm habit={habit} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {habits.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{habits.error ? habits.error.message : "This habit was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={() => router.back()} />
        </View>
      )}
    </SafeAreaView>
  );
}
