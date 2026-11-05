import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useSetVoiceAccess, useVoiceAccounts } from "@/lib/voice";

/** The admin ticks who gets voice messages. The database refuses anyone else. */
export default function VoiceAccessScreen() {
  const colors = useColors();
  const accounts = useVoiceAccounts();
  const setAccess = useSetVoiceAccess();
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
          Voice access
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-3 px-5 pb-8 pt-3">
        <Text className="font-sans text-label text-ink-muted">
          A ticked account can send you voice messages, and you can send to it. It also gets a fresh daily ulam.
        </Text>
        {accounts.error ? <Notice tone="danger">{accounts.error.message}</Notice> : null}
        {setAccess.error ? <Notice tone="danger">{setAccess.error.message}</Notice> : null}
        {accounts.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : !accounts.error && list.length === 0 ? (
          <EmptyState drawing="list" title="No other accounts yet" body="Accounts show here after they sign up." />
        ) : (
          list.map((account) => (
            <Pressable
              key={account.user_id}
              accessibilityRole="checkbox"
              accessibilityLabel={account.name}
              accessibilityState={{ checked: account.ticked, disabled: setAccess.isPending }}
              disabled={setAccess.isPending}
              onPress={() => setAccess.mutate({ userId: account.user_id, on: !account.ticked })}
              className="min-h-touch flex-row items-center gap-3 rounded-card border border-border bg-surface-card p-4 active:bg-surface-muted"
            >
              <Ionicons
                name={account.ticked ? "checkbox" : "square-outline"}
                size={24}
                color={account.ticked ? colors.accent : colors.inkMuted}
              />
              <View className="flex-1">
                <Text className="font-semibold text-row-title text-ink">{account.name}</Text>
                <Text className="font-sans text-caption text-ink-muted">{account.email}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
