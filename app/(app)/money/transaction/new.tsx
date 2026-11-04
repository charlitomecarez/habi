import { useLocalSearchParams } from "expo-router";

import { TransactionForm, type TransactionPrefill } from "@/components/money/TransactionForm";

export default function NewTransactionScreen() {
  const prefill = useLocalSearchParams<TransactionPrefill>();
  return <TransactionForm prefill={prefill} />;
}
