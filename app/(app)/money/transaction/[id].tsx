import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TransactionForm } from "@/components/money/TransactionForm";
import { Button } from "@/components/ui/Button";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useTransaction } from "@/lib/money";

export default function EditTransactionScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transaction, isPending } = useTransaction(id);

  if (transaction) return <TransactionForm transaction={transaction} />;

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-surface-page px-5">
      {isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-4">
          <Text className="text-center font-sans text-body text-ink-muted">This transaction no longer exists.</Text>
          <Button label="Back to money" variant="secondary" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
