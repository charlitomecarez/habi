import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemForm } from "@/components/inventory/ItemForm";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
import { useItem } from "@/lib/inventory";

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isPending } = useItem(id);

  if (item) return <ItemForm item={item} />;

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-surface-page px-5">
      {isPending ? (
        <View className="w-full flex-1 self-stretch pt-4">
          <Skeleton layout="detail" />
        </View>
      ) : (
        <View className="w-full gap-4">
          <Text className="text-center font-sans text-body text-ink-muted">This item no longer exists.</Text>
          <Button label="Back to inventory" variant="secondary" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
