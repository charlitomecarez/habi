import { useState } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { checkMasterPassword } from "@/lib/master-password";
import { goBack } from "@/lib/navigation";
import { useSecureScreen } from "@/lib/secure-screen";
import { useChangeMasterPassword, useVaultSettings } from "@/lib/vault";

/** Three fields, so a full screen. The same vault key gets a new lock; nothing else changes. */
export default function ChangeMasterPasswordScreen() {
  useSecureScreen("vault-change-password");
  const settings = useVaultSettings();
  const change = useChangeMasterPassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ next?: string; confirm?: string }>({});

  function onSave() {
    if (!settings.data) return;
    const found = {
      next:
        checkMasterPassword(next) ?? (next === current ? "Choose a password that is not the current one." : undefined),
      confirm: confirm !== next ? "The passwords do not match." : undefined,
    };
    setErrors(found);
    if (found.next || found.confirm) return;
    change.mutate({ current, next, settings: settings.data }, { onSuccess: goBack });
  }

  if (settings.data === null) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        <ModuleHeader title="Change master password" tone="records" />
        <EmptyState drawing="box" title="No vault yet" body="Set up the vault first." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Change master password" tone="records" />
      <KeyboardScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        <Text className="font-sans text-body text-ink-muted">
          Your logins, photos, fingerprint, PIN and recovery key keep working.
        </Text>
        <PasswordInput
          label="Current master password"
          value={current}
          onChangeText={setCurrent}
          textContentType="password"
        />
        <PasswordInput
          label="New master password"
          emphasis
          value={next}
          onChangeText={(text) => {
            setNext(text);
            setErrors((e) => ({ ...e, next: undefined }));
          }}
          textContentType="newPassword"
          error={errors.next}
        />
        <PasswordInput
          label="Confirm new master password"
          value={confirm}
          onChangeText={(text) => {
            setConfirm(text);
            setErrors((e) => ({ ...e, confirm: undefined }));
          }}
          textContentType="newPassword"
          error={errors.confirm}
          onSubmitEditing={onSave}
        />
        {change.error ? <ErrorNotice error={change.error} /> : null}
        <Button
          label="Change master password"
          loading={change.isPending}
          disabled={!current || !next || !settings.data}
          onPress={onSave}
        />
      </KeyboardScrollView>
    </SafeAreaView>
  );
}
