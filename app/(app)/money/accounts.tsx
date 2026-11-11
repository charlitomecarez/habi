import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountSheet } from "@/components/money/AccountSheet";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney, useAccounts, type Account } from "@/lib/money";

export default function AccountsScreen() {
  const accounts = useAccounts();
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const list = accounts.data ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar>
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Money accounts
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-fab-clear pt-2">
        {accounts.isPending ? (
          <Skeleton />
        ) : accounts.error ? (
          <Notice tone="danger">Could not load your accounts. {accounts.error.message}</Notice>
        ) : (
          <View>
            {list.map((a, index) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={`${a.name}, balance ${formatMoney(a.balance, a.currency)}. Edit account`}
                onPress={() => setEditing(a)}
                className={`min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted ${index < list.length - 1 ? "border-b-2 border-border" : ""}`}
              >
                <BrandIcon name={a.name} />
                <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-row-title text-ink">
                  {a.name}
                </Text>
                <Text className="font-semibold text-row-title text-ink">{formatMoney(a.balance, a.currency)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text className="font-sans text-caption text-ink-muted">
          You set each balance. Expenses, income, transfers and bills do not change it.
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
