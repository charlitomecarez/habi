import { useLocalSearchParams } from "expo-router";

import { ItemForm } from "@/components/inventory/ItemForm";

export default function NewItemScreen() {
  const { locationId, name } = useLocalSearchParams<{ locationId?: string; name?: string }>();
  return <ItemForm defaultLocationId={locationId} defaultName={name} />;
}
