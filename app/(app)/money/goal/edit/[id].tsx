import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoalForm } from "@/components/money/GoalForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorText } from "@/lib/errors";
import { goBack } from "@/lib/navigation";
import { useGoals } from "@/lib/goals";

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals = useGoals();
  const goal = goals.data?.goals.find((g) => g.id === id);
  if (goal) return <GoalForm goal={goal} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {goals.isPending ? (
        <View className="w-full flex-1 self-stretch pt-4">
          <Skeleton layout="detail" />
        </View>
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{goals.error ? errorText(goals.error) : "This goal was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
