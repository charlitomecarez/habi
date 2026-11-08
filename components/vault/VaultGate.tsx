import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { RestoreSheet } from "@/components/vault/RestoreSheet";
import { useColors } from "@/lib/colors";
import { checkMasterPassword } from "@/lib/master-password";
import { suggestPassphrase } from "@/lib/password";
import { pickBackupFile } from "@/lib/vault-backup";
import { parseBackup, type VaultBackup } from "@/lib/vault-backup-file";
import {
  useBiometricUnlock,
  usePinUnlock,
  useSetUpVault,
  useUnlockVault,
  useUnlockWithFingerprint,
  useUnlockWithPin,
} from "@/lib/vault";
import type { VaultSettingsRow } from "@/lib/vault-crypto";

/** The shared layout: a centred lock, title and text, fields, then the actions at the bottom. */
function GateLayout({
  title,
  text,
  fields,
  actions,
}: {
  title: string;
  text: string;
  fields: ReactNode;
  actions: ReactNode;
}) {
  const colors = useColors();
  return (
    <KeyboardScrollView
      contentContainerClassName="min-h-full justify-between gap-6 px-5 pb-8 pt-2"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-1 items-center justify-center gap-6">
        <View className="h-amount w-amount items-center justify-center rounded-hero bg-accent-tint">
          <Ionicons name="lock-closed-outline" size={32} color={colors.accent} />
        </View>
        <View className="items-center gap-2">
          <Text accessibilityRole="header" className="text-center font-bold text-title-lg text-ink">
            {title}
          </Text>
          <Text className="text-center font-sans text-body text-ink-muted">{text}</Text>
        </View>
        <View className="w-full gap-4">{fields}</View>
      </View>
      <View className="gap-3">{actions}</View>
    </KeyboardScrollView>
  );
}

/** First use: choose the master password. */
export function SetUpVault() {
  const setUp = useSetUpVault();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [backup, setBackup] = useState<VaultBackup | null>(null);
  const [backupProblem, setBackupProblem] = useState<string | null>(null);

  async function onPickBackup() {
    setBackupProblem(null);
    try {
      const text = await pickBackupFile();
      if (text === null) return;
      const parsed = parseBackup(text);
      if (parsed) setBackup(parsed);
      else setBackupProblem("That file is not a my-app vault backup.");
    } catch (error) {
      setBackupProblem(error instanceof Error ? error.message : "Could not read that file.");
    }
  }

  function onSetUp() {
    const next = {
      password: checkMasterPassword(password) ?? undefined,
      confirm: confirm !== password ? "The passwords do not match." : undefined,
    };
    setErrors(next);
    if (next.password || next.confirm) return;
    setUp.mutate(password);
  }

  return (
    <GateLayout
      title="Set up your vault"
      text="Choose a master password. It encrypts your logins on this phone before they go to the server. It's separate from your Google sign-in."
      fields={
        <>
          <PasswordInput
            label="Master password"
            emphasis
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors((e) => ({ ...e, password: undefined }));
            }}
            textContentType="newPassword"
            error={errors.password}
          />
          <PasswordInput
            label="Confirm master password"
            value={confirm}
            onChangeText={(text) => {
              setConfirm(text);
              setErrors((e) => ({ ...e, confirm: undefined }));
            }}
            textContentType="newPassword"
            error={errors.confirm}
            onSubmitEditing={onSetUp}
          />
          <Button
            label="Suggest a passphrase"
            variant="secondary"
            size="input"
            onPress={() => {
              suggestPassphrase().then(setSuggestion, () => setSuggestion(null));
            }}
          />
          {suggestion ? (
            <Text selectable className="text-center font-medium text-row-title text-ink">
              {suggestion}
            </Text>
          ) : null}
          <Notice tone="warning">
            Nobody can reset this password for you. Make a recovery key on the next screen: it is the only other way in.
            Keep both on paper in a safe place.
          </Notice>
          {setUp.error ? <Notice tone="danger">{setUp.error.message}</Notice> : null}
          {backupProblem ? <Notice tone="danger">{backupProblem}</Notice> : null}
        </>
      }
      actions={
        <>
          <Button label="Set up vault" loading={setUp.isPending} onPress={onSetUp} />
          <Button label="Restore backup" variant="secondary" size="input" onPress={onPickBackup} />
          {backup ? <RestoreSheet backup={backup} onClose={() => setBackup(null)} /> : null}
        </>
      }
    />
  );
}

/** Locked: the PIN when it is on, else the master password; fingerprint or face when quick unlock is on. */
export function UnlockVault({ settings }: { settings: VaultSettingsRow }) {
  const colors = useColors();
  const unlock = useUnlockVault();
  const fingerprint = useUnlockWithFingerprint();
  const biometric = useBiometricUnlock();
  const pinUnlock = usePinUnlock();
  const withPin = useUnlockWithPin();
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const pinMode = !!pinUnlock.data?.on && !usePassword;
  const hasRecovery = !!settings.recovery_wrap;

  function onUnlock() {
    if (!password) return;
    unlock.mutate({ password, settings }, { onSuccess: () => setPassword("") });
  }

  function onPin(next: string) {
    const digits = next.replace(/\D/g, "").slice(0, 6);
    setPin(digits);
    // The vault opens on the sixth digit.
    if (digits.length === 6) withPin.mutate({ pin: digits, settings }, { onSettled: () => setPin("") });
  }

  const failure = pinMode ? (withPin.error ?? fingerprint.error) : (unlock.error ?? fingerprint.error);

  return (
    <GateLayout
      title="Vault is locked"
      text={pinMode ? "Enter your 6-digit PIN." : "Enter your master password. It's separate from your Google sign-in."}
      fields={
        <>
          {pinMode ? (
            <PasswordInput
              label="PIN"
              emphasis
              value={pin}
              onChangeText={onPin}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoFocus={!biometric.data?.on}
              editable={!withPin.isPending}
            />
          ) : (
            <PasswordInput
              label="Master password"
              emphasis
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              autoFocus={!biometric.data?.on}
              onSubmitEditing={onUnlock}
            />
          )}
          {failure ? <Notice tone="danger">{failure.message}</Notice> : null}
        </>
      }
      actions={
        <>
          {pinMode ? null : (
            <Button label="Unlock" loading={unlock.isPending} disabled={!password} onPress={onUnlock} />
          )}
          {biometric.data?.on ? (
            <Button
              label={biometric.data.mode === "face" ? "Use face or fingerprint" : "Use fingerprint"}
              variant="secondary"
              icon={
                <Ionicons
                  name={biometric.data.mode === "face" ? "happy-outline" : "finger-print"}
                  size={20}
                  color={colors.ink}
                />
              }
              loading={fingerprint.isPending}
              onPress={() => fingerprint.mutate(settings)}
            />
          ) : null}
          {pinUnlock.data?.on ? (
            <Button
              label={pinMode ? "Use master password" : "Use PIN"}
              variant="secondary"
              size="input"
              onPress={() => setUsePassword(!usePassword)}
            />
          ) : null}
          {hasRecovery ? (
            <Button label="Forgot master password?" variant="plain" onPress={() => router.push("/vault/recover")} />
          ) : (
            <Text className="text-center font-sans text-badge text-ink-muted">
              With no recovery key, a forgotten master password can&apos;t be recovered.
            </Text>
          )}
        </>
      }
    />
  );
}
