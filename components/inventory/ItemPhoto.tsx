import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/lib/colors";
import { motion, useReduceMotion } from "@/lib/motion";

type ItemPhotoProps = {
  uri: string | null | undefined;
  /** Size and corner classes for the frame, e.g. "h-input w-input rounded-md". */
  className: string;
  label: string;
  iconSize?: number;
  /** The storage path of a saved photo. The disk cache keys on it, so a new signed URL does not
   * download the same photo again. Leave it out for a photo that is still on the phone. */
  cacheKey?: string | null;
};

/** A photo inside a bordered frame, or a placeholder icon when there is none. */
export function ItemPhoto({ uri, className, label, iconSize = 20, cacheKey }: ItemPhotoProps) {
  const reduced = useReduceMotion();
  const colors = useColors();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={uri ? `Photo of ${label}` : `No photo of ${label}`}
      className={`items-center justify-center overflow-hidden border border-border bg-surface-muted ${className}`}
    >
      {uri ? (
        <Image
          source={cacheKey ? { uri, cacheKey } : { uri }}
          cachePolicy="disk"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={reduced ? 0 : motion.fade}
        />
      ) : (
        <Ionicons name="cube-outline" size={iconSize} color={colors.inkMuted} />
      )}
    </View>
  );
}
