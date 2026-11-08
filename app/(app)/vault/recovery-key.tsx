import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { goBack } from "@/lib/navigation";
import { useSecureScreen } from "@/lib/secure-screen";
import { makeRecoveryCode, useSaveRecoveryKey, useVaultSettings, useVaultStore } from "@/lib/vault";
import { formatRecoveryCode } from "@/lib/vault-crypto";

/**
 * Shows a new recovery key once. It saves only after you tick "I wrote it down". There is no copy
 * button, so the key never sits on the clipboard.
 */
export default function RecoveryKeyScreen() {
  useSecureScreen("vault-recovery-key");
  const colors = useColors();
  const unlocked = useVaultStore((s) => s.key !== null);
  const settings = useVaultSettings();
  const save = useSaveRecoveryKey();
  const [code, setCode] = useState<string | null>(null);
  const [wrote, setWrote] = useState(false);

  useEffect(() => {
    let live = true;
    void makeRecoveryCode().then((next) => {
      if (live) setCode(next);
    });
    return () => {
      live = false;
    };
  }, []);

  const replacing = !!settings.data?.recovery_wrap;

  if (!unlocked) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        <ModuleHeader title="Recovery key" tone="records" />
        <EmptyState drawing="box" title="The vault is locked" body="Unlock it, then make a recovery key." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Recovery key" tone="records" />
      <KeyboardScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        <Text className="font-sans text-body text-ink">
          Write this down and keep it on paper, away from your phone. It opens your vault if you forget the master
          password. I show it once.
        </Text>
        {code ? (
          <Text
            selectable={false}
            accessibilityLabel={`Recovery key: ${[...code].join(" ")}`}
            className="rounded-card bg-surface-muted px-4 py-4 text-center font-bold text-title text-ink"
          >
            {formatRecoveryCode(code)}
          </Text>
        ) : (
          <Skeleton>
            <Skeleton.Block className="h-amount" />
          </Skeleton>
        )}
        {replacing ? (
          <Notice tone="warning">Saving this key stops your old recovery key. Only the new one will work.</Notice>
        ) : null}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: wrote }}
          onPress={() => setWrote(!wrote)}
          className="min-h-touch flex-row items-center gap-3 border-b-2 border-border py-2"
        >
          <Ionicons
            name={wrote ? "checkbox" : "square-outline"}
            size={24}
            color={wrote ? colors.accent : colors.inkMuted}
          />
          <Text className="flex-1 font-semibold text-row-title text-ink">I wrote it down</Text>
        </Pressable>
        {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
        <Button
          label="Save recovery key"
          disabled={!code || !wrote}
          loading={save.isPending}
          onPress={() => code && save.mutate(code, { onSuccess: goBack })}
        />
      </KeyboardScrollView>
    </SafeAreaView>
  );
}
