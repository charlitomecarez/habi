import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountSheet } from "@/components/money/AccountSheet";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { formatMoney, useAccounts, type Account } from "@/lib/money";

export default function AccountsScreen() {
  const colors = useColors();
  const accounts = useAccounts();
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const list = accounts.data ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Money accounts
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-32 pt-2">
        {accounts.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : accounts.error ? (
          <Notice tone="danger">Could not load your accounts. {accounts.error.message}</Notice>
        ) : (
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            {list.map((a, index) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={`${a.name}, balance ${formatMoney(a.balance, a.currency)}. Edit account`}
                onPress={() => setEditing(a)}
                className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${index < list.length - 1 ? "border-b border-divider" : ""}`}
              >
                <BrandIcon name={a.name} />
                <View className="min-w-0 flex-1 gap-1">
                  <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
                    {a.name}
                  </Text>
                  <Text className="font-sans text-caption text-ink-muted">
                    Opening balance {formatMoney(a.opening_balance, a.currency)}
                  </Text>
                </View>
                <Text className="font-semibold text-row-title text-ink">{formatMoney(a.balance, a.currency)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text className="font-sans text-caption text-ink-muted">
          Balance is the opening balance plus every transaction. Set the opening balance to what the account held before
          your first logged transaction.
        </Text>
      </ScrollView>

      <Fab label="Add account" onPress={() => setEditing("new")} />

      <AccountSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        account={editing === "new" ? null : editing}
      />
    </SafeAreaView>
  );
}
