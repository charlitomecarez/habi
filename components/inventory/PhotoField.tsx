import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Text, View } from "react-native";

import { ItemPhoto } from "@/components/inventory/ItemPhoto";
import { Button } from "@/components/ui/Button";
import { colors } from "@/lib/colors";
import type { LocalPhoto } from "@/lib/inventory";

type PhotoFieldProps = {
  /** What to show now: a picked photo's local URI or the saved photo's signed URL. */
  previewUri: string | null;
  itemName: string;
  onPick: (photo: LocalPhoto) => void;
  onRemove: () => void;
};

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: "images",
  quality: 1, // Compression happens once, on upload.
  allowsEditing: false,
};

export function PhotoField({ previewUri, itemName, onPick, onRemove }: PhotoFieldProps) {
  const [error, setError] = useState<string | null>(null);

  async function pick(source: "camera" | "library") {
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
      <Text className="font-medium text-label text-ink">
        Photo<Text className="font-sans text-ink-muted"> (optional)</Text>
      </Text>
      {previewUri ? (
        <ItemPhoto uri={previewUri} label={itemName || "this item"} className="aspect-video w-full rounded-card" />
      ) : null}
      <View className="flex-row gap-3">
        <View className="min-w-0 flex-1">
          <Button
            label={previewUri ? "Retake" : "Take photo"}
            variant="secondary"
            size="input"
            icon={<Ionicons name="camera-outline" size={18} color={colors.ink} />}
            onPress={() => pick("camera")}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Button
            label="Choose photo"
            variant="secondary"
            size="input"
            icon={<Ionicons name="image-outline" size={18} color={colors.ink} />}
            onPress={() => pick("library")}
          />
        </View>
      </View>
      {previewUri ? <Button label="Remove photo" variant="destructive" size="input" onPress={onRemove} /> : null}
      {error ? <Text className="font-sans text-caption text-danger">{error}</Text> : null}
    </View>
  );
}
