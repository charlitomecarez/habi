import { useLocalSearchParams } from "expo-router";

import { ItemForm } from "@/components/travel/ItemForm";

export default function NewTripItemScreen() {
  const { tripId, day } = useLocalSearchParams<{ tripId: string; day?: string }>();
  return <ItemForm tripId={tripId} day={day} />;
}
