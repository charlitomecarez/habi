import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PhotoField } from "@/components/ui/PhotoField";
import { useColors } from "@/lib/colors";
import { errorText } from "@/lib/errors";
import type { LocalPhoto } from "@/lib/photos";
import { useDecryptedPhoto } from "@/lib/secure-photos";
import { useSecureScreen } from "@/lib/secure-screen";
import { useVaultStore } from "@/lib/vault";

/** Blocks screenshots only while decrypted photos are on screen. */
function ScreenGuard() {
  useSecureScreen("secure-photos");
  return null;
}

function SecureThumb({ path, subject, onRemove }: { path: string; subject: string; onRemove: () => void }) {
  const colors = useColors();
  const photo = useDecryptedPhoto(path);
  return (
    <View className="h-tile w-tile overflow-hidden rounded-input border border-border bg-surface-muted">
      {photo.data ? (
        <Image
          source={{ uri: photo.data }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          accessibilityLabel={subject}
        />
      ) : photo.error ? (
        <Text className="p-2 font-sans text-badge text-danger">{errorText(photo.error)}</Text>
      ) : (
        <ActivityIndicator color={colors.accent} className="flex-1" />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${subject}`}
        onPress={onRemove}
        className="absolute right-0 top-0 h-touch w-touch items-center justify-center"
      >
        <View className="rounded-pill bg-surface-card p-1">
          <Ionicons name="close" size={16} color={colors.ink} />
        </View>
      </Pressable>
    </View>
  );
}

type SecurePhotosProps = {
  label: string;
  /** What the photos show, for screen readers, e.g. "Passport photo". */
  subject: string;
  paths: string[];
  onAdd: (photo: LocalPhoto, key: Uint8Array) => Promise<void>;
  onRemove: (path: string) => void;
};

/**
 * Photos encrypted with the Vault key. While the Vault is locked it shows how many there are
 * and a way to unlock; nothing is downloaded or decrypted until then.
 */
export function SecurePhotos({ label, subject, paths, onAdd, onRemove }: SecurePhotosProps) {
  const key = useVaultStore((s) => s.key);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!key) {
    return (
      <View className="gap-3">
        <Text className="font-semibold text-label text-ink">{label}</Text>
        <Notice tone="warning">
          {paths.length
            ? `${paths.length} encrypted ${paths.length === 1 ? "photo" : "photos"}. Unlock the Vault to see or add photos.`
            : "Photos are encrypted with your Vault key. Unlock the Vault to add one."}
        </Notice>
        <Button label="Unlock the Vault" variant="secondary" size="input" onPress={() => router.push("/vault")} />
      </View>
    );
  }

  return (
    <View className="gap-3">
      {paths.length > 0 ? <ScreenGuard /> : null}
      <Text className="font-semibold text-label text-ink">{label}</Text>
      {paths.length ? (
        <View className="flex-row flex-wrap gap-3">
          {paths.map((p, i) => (
            <SecureThumb key={p} path={p} subject={`${subject} ${i + 1}`} onRemove={() => onRemove(p)} />
          ))}
        </View>
      ) : null}
      {busy ? (
        <ActivityIndicator />
      ) : (
        <PhotoField
          label="Add photo"
          previewUri={null}
          subject={subject}
          layout="single"
          singleLabel="Add photo"
          onRemove={() => undefined}
          onPick={async (photo) => {
            setBusy(true);
            setError(null);
            try {
              await onAdd(photo, key);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not save the photo.");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Text className="font-sans text-caption text-ink-muted">
        Encrypted on this phone. Supabase only stores the encrypted file.
      </Text>
    </View>
  );
}
