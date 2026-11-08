import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandIcon } from "@/components/ui/BrandIcon";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { OptionSheet } from "@/components/ui/OptionSheet";
import { SetUpVault, UnlockVault } from "@/components/vault/VaultGate";
import { copySecret } from "@/lib/clipboard";
import { useColors } from "@/lib/colors";
import { useSecureScreen } from "@/lib/secure-screen";
import {
  AUTO_LOCK_MINUTES,
  IDLE_LOCK_MINUTES,
  useExportBackup,
  useBiometricUnlock,
  useSetBiometricUnlock,
  useVaultEntries,
  useVaultSettings,
  useVaultStore,
  type BiometricMode,
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
  const exportBackup = useExportBackup();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [choosingUnlock, setChoosingUnlock] = useState(false);

  async function copyPassword(title: string, password: string) {
    await copySecret(password, CLEAR_CLIPBOARD_SECONDS * 1000);
    setCopied(title);
  }

  const visible = entries.filter((e) => matches(e, query));

  return (
    <KeyboardScrollView contentContainerClassName="gap-4 px-5 pb-fab-clear pt-3" keyboardShouldPersistTaps="handled">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-1">
            <Ionicons
              name={
                unlockedWith === "fingerprint"
                  ? "finger-print"
                  : unlockedWith === "face"
                    ? "happy-outline"
                    : "lock-open-outline"
              }
              size={16}
              color={colors.inkMuted}
            />
            <Text className="font-sans text-label text-ink-muted">
              {unlockedWith === "fingerprint"
                ? "Unlocked with fingerprint"
                : unlockedWith === "face"
                  ? "Unlocked with face or fingerprint"
                  : "Unlocked"}
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
        <View accessibilityLiveRegion="polite">
          <Notice tone="neutral">
            Password for {copied} copied. The clipboard clears in {CLEAR_CLIPBOARD_SECONDS} seconds.
          </Notice>
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
        <Text className="py-4 font-sans text-body text-ink-muted">I keep your logins here. Add your first one.</Text>
      ) : visible.length === 0 ? (
        <Text className="py-4 font-sans text-body text-ink-muted">No logins match “{query.trim()}”.</Text>
      ) : (
        <View>
          {visible.map((entry, index) => {
            const data = entry.data;
            const title = data?.title || "Untitled";
            return (
              <View
                key={entry.id}
                className={`min-h-touch flex-row items-center gap-3 py-3 ${index < visible.length - 1 ? "border-b-2 border-border" : ""}`}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={data ? `Edit ${title}` : "This entry cannot be read"}
                  disabled={!data}
                  onPress={() => router.push({ pathname: "/vault/entry/[id]", params: { id: entry.id } })}
                  className="min-h-touch min-w-0 flex-1 flex-row items-center gap-3"
                >
                  <BrandIcon name={title} hint={data?.url} />
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
          after {CLEAR_CLIPBOARD_SECONDS} seconds. The vault locks after {AUTO_LOCK_MINUTES} minute in the background,
          and after {IDLE_LOCK_MINUTES} minutes with no touch.
        </Text>
      </View>

      {biometric.data?.available ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quick unlock, ${quickUnlockLabel(biometric.data.mode)}. Change`}
            disabled={setBiometric.isPending}
            onPress={() => setChoosingUnlock(true)}
            className="min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted"
          >
            <Ionicons
              name={biometric.data.mode === "face" ? "happy-outline" : "finger-print"}
              size={20}
              color={colors.ink}
            />
            <View className="min-w-0 flex-1 gap-1">
              <Text className="font-medium text-row-title text-ink">Quick unlock</Text>
              <Text className="font-sans text-caption text-ink-muted">{quickUnlockLabel(biometric.data.mode)}</Text>
            </View>
            {setBiometric.isPending ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            )}
          </Pressable>
          {biometric.data.mode === "face" ? (
            <Notice tone="warning">
              Face unlock on this phone is a weaker kind of biometric, so the vault key is stored encrypted on the phone
              but not locked behind your fingerprint. Fingerprint only is safer.
            </Notice>
          ) : null}
          <OptionSheet
            visible={choosingUnlock}
            onClose={() => setChoosingUnlock(false)}
            title="Quick unlock"
            subtitle="Fingerprint only keeps the vault key locked behind your fingerprint. Face or fingerprint is easier but less safe: this phone's face unlock is not strong enough to lock the key."
            options={[
              { value: "off", label: "Off: master password only" },
              ...(biometric.data.fingerprint ? [{ value: "fingerprint", label: "Fingerprint only (safest)" }] : []),
              ...(biometric.data.face ? [{ value: "face", label: "Face or fingerprint" }] : []),
            ]}
            value={biometric.data.mode ?? "off"}
            onChange={(value) => {
              setChoosingUnlock(false);
              setBiometric.mutate(value === "off" ? null : (value as BiometricMode));
            }}
          />
        </>
      ) : null}
      {setBiometric.error ? <Notice tone="danger">{setBiometric.error.message}</Notice> : null}

      <Button
        label="Export backup"
        variant="secondary"
        size="input"
        loading={exportBackup.isPending}
        onPress={() => exportBackup.mutate()}
      />
      <Text className="font-sans text-caption text-ink-muted">
        The file stays encrypted and opens only with your master password. It does not hold encrypted photos, and it is
        a copy from now.
      </Text>
      {exportBackup.error ? <Notice tone="danger">{exportBackup.error.message}</Notice> : null}
    </KeyboardScrollView>
  );
}

function quickUnlockLabel(mode: BiometricMode | null | undefined): string {
  return mode === "fingerprint" ? "Fingerprint only" : mode === "face" ? "Face or fingerprint" : "Off";
}

export default function VaultScreen() {
  const colors = useColors();
  const key = useVaultStore((s) => s.key);
  const settings = useVaultSettings();
  useSecureScreen("vault");

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Vault" tone="records" />

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
