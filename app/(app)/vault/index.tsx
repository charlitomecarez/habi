import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { LetterAvatar } from "@/components/ui/LetterAvatar";
import { Notice } from "@/components/ui/Notice";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SetUpVault, UnlockVault } from "@/components/vault/VaultGate";
import { copySecret } from "@/lib/clipboard";
import { useColors } from "@/lib/colors";
import {
  AUTO_LOCK_MINUTES,
  useBiometricUnlock,
  useSetBiometricUnlock,
  useVaultEntries,
  useVaultSettings,
  useVaultStore,
  type VaultEntry,
} from "@/lib/vault";

const CLEAR_CLIPBOARD_SECONDS = 30;

function matches(entry: VaultEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (!entry.data) return false;
  return [entry.data.title, entry.data.username, entry.data.url].some((v) => v.toLowerCase().includes(q));
}

function UnlockedVault() {
  const colors = useColors();
  const lock = useVaultStore((s) => s.lock);
  const unlockedWith = useVaultStore((s) => s.unlockedWith);
  const { entries, isPending, error, refetch } = useVaultEntries();
  const biometric = useBiometricUnlock();
  const setBiometric = useSetBiometricUnlock();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function copyPassword(title: string, password: string) {
    await copySecret(password, CLEAR_CLIPBOARD_SECONDS * 1000);
    setCopied(title);
  }

  const visible = entries.filter((e) => matches(e, query));

  return (
    <ScrollView contentContainerClassName="gap-4 px-5 pb-32 pt-2" keyboardShouldPersistTaps="handled">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <ScreenHeader title="Vault" />
          <View className="flex-row items-center gap-1">
            <Ionicons
              name={unlockedWith === "fingerprint" ? "finger-print" : "lock-open-outline"}
              size={16}
              color={colors.inkMuted}
            />
            <Text className="font-sans text-label text-ink-muted">
              {unlockedWith === "fingerprint" ? "Unlocked with fingerprint" : "Unlocked"}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lock vault"
          onPress={lock}
          className="h-touch flex-row items-center gap-2 rounded-md border border-border-input bg-surface-card px-4 active:bg-surface-muted"
        >
          <Ionicons name="lock-closed-outline" size={16} color={colors.ink} />
          <Text className="font-semibold text-label text-ink">Lock</Text>
        </Pressable>
      </View>

      <View className="h-input flex-row items-center gap-3 rounded-input border border-border-input bg-surface-card px-4">
        <Ionicons name="search" size={18} color={colors.inkMuted} />
        <TextInput
          accessibilityLabel="Search vault"
          value={query}
          onChangeText={setQuery}
          placeholder="Search vault"
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          autoCorrect={false}
          className="h-input flex-1 font-sans text-body text-ink"
        />
      </View>

      {copied ? (
        <View accessibilityLiveRegion="polite" className="rounded-input bg-accent-tint px-4 py-3">
          <Text className="font-sans text-caption text-accent-strong">
            Password for {copied} copied. The clipboard clears in {CLEAR_CLIPBOARD_SECONDS} seconds.
          </Text>
        </View>
      ) : null}

      {isPending ? (
        <ActivityIndicator color={colors.accent} className="py-8" />
      ) : error ? (
        <View className="gap-3">
          <Notice tone="danger">Could not load the vault. {error.message}</Notice>
          <Button label="Try again" variant="secondary" size="input" onPress={() => refetch()} />
        </View>
      ) : entries.length === 0 ? (
        <View className="items-center rounded-card border border-border bg-surface-card p-6">
          <Text className="text-center font-sans text-body text-ink-muted">No logins yet.</Text>
        </View>
      ) : visible.length === 0 ? (
        <View className="items-center rounded-card border border-border bg-surface-card p-6">
          <Text className="text-center font-sans text-body text-ink-muted">No logins match “{query.trim()}”.</Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-card border border-border bg-surface-card">
          {visible.map((entry, index) => {
            const data = entry.data;
            const title = data?.title || "Untitled";
            return (
              <View
                key={entry.id}
                className={`min-h-touch flex-row items-center gap-3 py-3 pl-4 pr-3 ${index < visible.length - 1 ? "border-b border-divider" : ""}`}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={data ? `Edit ${title}` : "This entry cannot be read"}
                  disabled={!data}
                  onPress={() => router.push({ pathname: "/vault/entry/[id]", params: { id: entry.id } })}
                  className="min-h-touch min-w-0 flex-1 flex-row items-center gap-3"
                >
                  <LetterAvatar name={title} />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
                      {data ? title : "Cannot read this entry"}
                    </Text>
                    <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
                      {data ? data.username || data.url || "No username" : "It was encrypted with a different key."}
                    </Text>
                  </View>
                </Pressable>
                {data?.password ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Copy password for ${title}`}
                    onPress={() => copyPassword(title, data.password)}
                    className="h-touch w-touch items-center justify-center rounded-md active:bg-surface-muted"
                  >
                    <Ionicons name="copy-outline" size={20} color={colors.ink} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <View className="flex-row items-start gap-2">
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.inkMuted} />
        <Text className="flex-1 font-sans text-caption text-ink-muted">
          Encrypted on this phone. The server only stores scrambled data, and copied passwords clear from the clipboard
          after {CLEAR_CLIPBOARD_SECONDS} seconds. The vault locks after {AUTO_LOCK_MINUTES} minutes in the background.
        </Text>
      </View>

      {biometric.data?.available ? (
        <View className="min-h-touch flex-row items-center gap-3 rounded-card border border-border bg-surface-card px-4 py-3">
          <Ionicons name="finger-print" size={20} color={colors.ink} />
          <Text className="flex-1 font-medium text-row-title text-ink">Unlock with fingerprint</Text>
          <Switch
            accessibilityLabel="Unlock with fingerprint"
            value={biometric.data.on}
            disabled={setBiometric.isPending}
            onValueChange={(on) => setBiometric.mutate(on)}
            trackColor={{ true: colors.accent }}
          />
        </View>
      ) : null}
      {setBiometric.error ? <Notice tone="danger">{setBiometric.error.message}</Notice> : null}
    </ScrollView>
  );
}

export default function VaultScreen() {
  const colors = useColors();
  const key = useVaultStore((s) => s.key);
  const settings = useVaultSettings();

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <View className="px-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
      </View>

      {settings.isPending ? (
        <ActivityIndicator color={colors.accent} className="py-8" />
      ) : settings.error ? (
        <View className="gap-3 px-5">
          <Notice tone="danger">Could not load the vault. {settings.error.message}</Notice>
          <Button label="Try again" variant="secondary" size="input" onPress={() => settings.refetch()} />
        </View>
      ) : !settings.data ? (
        <SetUpVault />
      ) : key ? (
        <UnlockedVault />
      ) : (
        <UnlockVault settings={settings.data} />
      )}

      {key && settings.data ? <Fab label="Add login" onPress={() => router.push("/vault/entry/new")} /> : null}
    </SafeAreaView>
  );
}
