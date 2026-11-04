import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DebtForm } from "@/components/debts/DebtForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useDebt } from "@/lib/debts";

export default function EditDebtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const debt = useDebt(id);
  if (debt.data) return <DebtForm debt={debt.data} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {debt.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{debt.error ? debt.error.message : "This debt was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={() => router.back()} />
        </View>
      )}
    </SafeAreaView>
  );
}
