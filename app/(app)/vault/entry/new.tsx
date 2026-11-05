import { Redirect } from "expo-router";

import { EntryForm } from "@/components/vault/EntryForm";
import { useSecureScreen } from "@/lib/secure-screen";
import { useVaultStore } from "@/lib/vault";

export default function NewEntryScreen() {
  const unlocked = useVaultStore((s) => s.key !== null);
  useSecureScreen("vault-new");
  if (!unlocked) return <Redirect href="/vault" />;
  return <EntryForm />;
}
