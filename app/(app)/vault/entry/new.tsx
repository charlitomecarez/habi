import { Redirect } from "expo-router";

import { EntryForm } from "@/components/vault/EntryForm";
import { useVaultStore } from "@/lib/vault";

export default function NewEntryScreen() {
  const unlocked = useVaultStore((s) => s.key !== null);
  if (!unlocked) return <Redirect href="/vault" />;
  return <EntryForm />;
}
