import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemForm } from "@/components/travel/ItemForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useTripItems } from "@/lib/travel";

export default function EditTripItemScreen() {
  const { id, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const colors = useColors();
  const items = useTripItems(tripId);
  const item = items.data?.find((i) => i.id === id);
  if (item) return <ItemForm tripId={tripId} item={item} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {items.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{items.error ? items.error.message : "This item was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
