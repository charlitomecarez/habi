import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemForm } from "@/components/travel/ItemForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorText } from "@/lib/errors";
import { goBack } from "@/lib/navigation";
import { useTripItems } from "@/lib/travel";

export default function EditTripItemScreen() {
  const { id, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const items = useTripItems(tripId);
  const item = items.data?.find((i) => i.id === id);
  if (item) return <ItemForm tripId={tripId} item={item} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {items.isPending ? (
        <View className="w-full flex-1 self-stretch pt-4">
          <Skeleton layout="detail" />
        </View>
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{items.error ? errorText(items.error) : "This item was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
