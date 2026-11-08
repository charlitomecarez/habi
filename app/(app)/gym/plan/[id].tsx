import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlanForm } from "@/components/gym/PlanForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
import { useGym } from "@/lib/gym";

export default function EditPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gym = useGym();
  const plan = gym.data?.plans.find((p) => p.id === id);
  if (plan) return <PlanForm plan={plan} exercises={gym.data?.exercises.filter((e) => e.plan_id === id)} />;
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
