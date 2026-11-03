import { useLocalSearchParams } from "expo-router";

import { ItemForm } from "@/components/inventory/ItemForm";

export default function NewItemScreen() {
  const { locationId } = useLocalSearchParams<{ locationId?: string }>();
  return <ItemForm defaultLocationId={locationId} />;
}
