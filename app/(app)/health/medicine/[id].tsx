import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MedicineForm } from "@/components/health/MedicineForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useHealth } from "@/lib/health";

export default function EditMedicineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const health = useHealth();
  const medicine = health.data?.medicines.find((m) => m.id === id);
  if (medicine) return <MedicineForm medicine={medicine} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {health.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{health.error ? health.error.message : "This medicine was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
