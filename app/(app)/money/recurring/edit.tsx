import { useLocalSearchParams } from "expo-router";

import { RecurringForm } from "@/components/money/RecurringForm";
import { useRecurring } from "@/lib/recurring";

export default function EditRecurringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rule = useRecurring().data?.find((r) => r.id === id);
  return rule ? <RecurringForm rule={rule} /> : null;
}
