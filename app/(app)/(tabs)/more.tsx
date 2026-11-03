import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors } from "@/lib/colors";
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

        <View className="overflow-hidden rounded-card border border-border bg-surface-card">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/inventory")}
            className="min-h-touch flex-row items-center gap-3 border-b border-divider px-4 py-3 active:bg-surface-muted"
          >
            <Ionicons name="cube-outline" size={20} color={colors.ink} />
            <View className="flex-1 gap-1">
              <Text className="font-semibold text-row-title text-ink">Inventory</Text>
              <Text className="font-sans text-caption text-ink-muted">Things in your room and where they are</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
          </Pressable>
          <View className="min-h-touch flex-row items-center gap-3 px-4 py-3">
            <Ionicons name="lock-closed-outline" size={20} color={colors.inkMuted} />
            <View className="flex-1 gap-1">
              <Text className="font-semibold text-row-title text-ink-muted">Vault and settings</Text>
              <Text className="font-sans text-caption text-ink-muted">Coming in phase 6.</Text>
            </View>
          </View>
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
