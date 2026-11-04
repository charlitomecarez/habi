import { useLocalSearchParams } from "expo-router";

import { DebtForm } from "@/components/debts/DebtForm";

export default function NewDebtScreen() {
  const { person, direction } = useLocalSearchParams<{ person?: string; direction?: string }>();
  return <DebtForm person={person} direction={direction === "i_owe" ? "i_owe" : "owed_to_me"} />;
}
