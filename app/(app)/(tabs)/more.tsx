import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAuth } from "@/providers/auth-provider";

export default function MoreScreen() {
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const user = session?.user;
  const name = (user?.user_metadata.full_name as string | undefined) ?? user?.email ?? "Signed in";
  const provider = user?.app_metadata.provider === "google" ? "Signed in with Google" : "Signed in with email";

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <View className="flex-1 gap-6 px-5 pt-6">
        <ScreenHeader title="More" />

        <View className="flex-row items-center gap-4 rounded-card border border-border bg-surface-card p-4">
          <View className="h-12 w-12 items-center justify-center rounded-pill bg-border">
            <Text className="font-semibold text-title text-ink">{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="font-semibold text-heading text-ink" numberOfLines={1}>
              {name}
            </Text>
            <Text className="font-sans text-caption text-ink-muted">{provider}</Text>
          </View>
        </View>

        <View className="gap-1 rounded-card border border-border bg-surface-card p-4">
          <Text className="font-semibold text-heading text-ink">Inventory, Vault and settings</Text>
          <Text className="font-sans text-caption text-ink-muted">Coming in phases 4 and 6.</Text>
        </View>

        <Button
          label="Sign out"
          variant="destructive"
          size="input"
          loading={signingOut}
          onPress={onSignOut}
        />
      </View>
    </SafeAreaView>
  );
}
