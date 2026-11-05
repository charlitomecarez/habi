import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Sheet } from "@/components/ui/Sheet";
import { useRestoreBackup } from "@/lib/vault";
import type { VaultBackup } from "@/lib/vault-backup-file";

/** Asks for the master password of the backup, then restores it into this empty vault. */
export function RestoreSheet({ backup, onClose }: { backup: VaultBackup; onClose: () => void }) {
  const restore = useRestoreBackup();
  const [password, setPassword] = useState("");
  const count = backup.entries.length;

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Restore backup"
      subtitle={`${count} ${count === 1 ? "login" : "logins"}, from ${backup.exportedAt.slice(0, 10)}.`}
    >
      <View className="gap-4 px-5 pb-5 pt-3">
        <PasswordInput
          label="Master password of the backup"
          value={password}
          onChangeText={setPassword}
          textContentType="password"
        />
        <Text className="font-sans text-caption text-ink-muted">
          Nothing is written until this password opens the backup.
        </Text>
        {restore.error ? <Notice tone="danger">{restore.error.message}</Notice> : null}
        <Button
          label="Restore backup"
          disabled={!password}
          loading={restore.isPending}
          onPress={() => restore.mutate({ backup, password }, { onSuccess: onClose })}
        />
      </View>
    </Sheet>
  );
}
