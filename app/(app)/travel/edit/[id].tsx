import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TripForm } from "@/components/travel/TripForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useTrip } from "@/lib/travel";

export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const trip = useTrip(id);
  if (trip.data) return <TripForm trip={trip.data} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {trip.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{trip.error ? trip.error.message : "This trip was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
