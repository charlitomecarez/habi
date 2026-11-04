import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Text, View } from "react-native";

import { ItemPhoto } from "@/components/inventory/ItemPhoto";
import { Button } from "@/components/ui/Button";
import { DashedButton } from "@/components/ui/DashedButton";
import { OptionSheet } from "@/components/ui/OptionSheet";
import { useColors } from "@/lib/colors";
import type { LocalPhoto } from "@/lib/photos";

type Source = "camera" | "library";

type PhotoFieldProps = {
  label: string;
  /** What to show now: a picked photo's local URI or the saved photo's signed URL. */
  previewUri: string | null;
  /** What the photo shows, for screen readers. */
  subject: string;
  onPick: (photo: LocalPhoto) => void;
  onRemove: () => void;
  /**
   * "tiles": two tall slots, Take photo and Choose photo.
   * "single": one wide slot that asks where the photo comes from.
   */
  layout?: "tiles" | "single";
  singleLabel?: string;
};

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: "images",
  quality: 1, // Compression happens once, on upload.
  allowsEditing: false,
};

const SOURCE_OPTIONS = [
  { value: "camera", label: "Take photo" },
  { value: "library", label: "Choose photo" },
] as const;

export function PhotoField({
  label,
  previewUri,
  subject,
  onPick,
  onRemove,
  layout = "tiles",
  singleLabel = "Add photo",
}: PhotoFieldProps) {
  const colors = useColors();
  const [error, setError] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  async function pick(source: Source) {
    setError(null);
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError("Camera access is off. Turn it on in Settings › Apps › my-app › Permissions.");
          return;
        }
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = result.canceled ? undefined : result.assets[0];
      if (asset) onPick({ uri: asset.uri, width: asset.width, height: asset.height });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the photo picker.");
    }
  }

  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">
        {label}
        <Text className="font-sans text-ink-muted"> (optional)</Text>
      </Text>
      {previewUri ? (
        <>
          <ItemPhoto uri={previewUri} label={subject} className="aspect-video w-full rounded-card" />
          <View className="flex-row gap-3">
            <View className="min-w-0 flex-1">
              <Button
                label="Retake"
                variant="secondary"
                size="input"
                icon={<Ionicons name="camera-outline" size={18} color={colors.ink} />}
                onPress={() => pick("camera")}
              />
            </View>
            <View className="min-w-0 flex-1">
              <Button label="Remove" variant="destructive" size="input" onPress={onRemove} />
            </View>
          </View>
        </>
      ) : layout === "tiles" ? (
        <View className="flex-row gap-3">
          <DashedButton shape="tall" icon="camera-outline" label="Take photo" onPress={() => pick("camera")} />
          <DashedButton shape="tall" icon="image-outline" label="Choose photo" onPress={() => pick("library")} />
        </View>
      ) : (
        <DashedButton icon="camera-outline" label={singleLabel} onPress={() => setChoosing(true)} />
      )}
      {error ? <Text className="font-sans text-caption text-danger">{error}</Text> : null}

      <OptionSheet
        visible={choosing}
        onClose={() => setChoosing(false)}
        title={singleLabel}
        options={SOURCE_OPTIONS}
        value={null}
        onChange={(source) => pick(source)}
      />
    </View>
  );
}
