import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntryForm } from "@/components/vault/EntryForm";
import { Button } from "@/components/ui/Button";
import { useColors } from "@/lib/colors";
import { useSecureScreen } from "@/lib/secure-screen";
import { useVaultEntry, useVaultStore } from "@/lib/vault";

export default function EditEntryScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const unlocked = useVaultStore((s) => s.key !== null);
  useSecureScreen("vault-entry");
  const { entry, isPending } = useVaultEntry(id);

  if (!unlocked) return <Redirect href="/vault" />;
  if (entry?.data) return <EntryForm entry={entry} />;

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-surface-page px-5">
      {isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-4">
          <Text className="text-center font-sans text-body text-ink-muted">This login no longer exists.</Text>
          <Button label="Back to vault" variant="secondary" onPress={() => router.back()} />
        </View>
      )}
    </SafeAreaView>
  );
}
