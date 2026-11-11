import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DebtForm } from "@/components/debts/DebtForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorText } from "@/lib/errors";
import { goBack } from "@/lib/navigation";
import { useDebt } from "@/lib/debts";

export default function EditDebtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const debt = useDebt(id);
  if (debt.data) return <DebtForm debt={debt.data} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {debt.isPending ? (
        <View className="w-full flex-1 self-stretch pt-4">
          <Skeleton layout="detail" />
        </View>
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{debt.error ? errorText(debt.error) : "This debt was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
