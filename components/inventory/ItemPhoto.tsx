import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { colors } from "@/lib/colors";

type ItemPhotoProps = {
  uri: string | null | undefined;
  /** Size and corner classes for the frame, e.g. "h-input w-input rounded-md". */
  className: string;
  label: string;
  iconSize?: number;
};

/** A photo inside a bordered frame, or a placeholder icon when there is none. */
export function ItemPhoto({ uri, className, label, iconSize = 20 }: ItemPhotoProps) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={uri ? `Photo of ${label}` : `No photo of ${label}`}
      className={`items-center justify-center overflow-hidden border border-border bg-surface-muted ${className}`}
    >
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Ionicons name="cube-outline" size={iconSize} color={colors.inkMuted} />
      )}
    </View>
  );
}
