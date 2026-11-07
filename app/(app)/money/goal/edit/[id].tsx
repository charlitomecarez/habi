import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoalForm } from "@/components/money/GoalForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useGoals } from "@/lib/goals";

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const goals = useGoals();
  const goal = goals.data?.goals.find((g) => g.id === id);
  if (goal) return <GoalForm goal={goal} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {goals.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{goals.error ? goals.error.message : "This goal was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
