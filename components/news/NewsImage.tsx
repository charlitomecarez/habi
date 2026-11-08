import { Image } from "expo-image";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

const FADE_MS = 150;

/**
 * A story's image in a 64 px square. While it loads, and if it fails, the square stays muted, so the
 * headline never re-wraps. It is decorative: TalkBack reads the headline only.
 */
export function NewsImage({ uri }: { uri: string }) {
  const reduced = useReducedMotion();
  return (
    <View
      className="h-slot w-slot overflow-hidden rounded-md border-2 border-border bg-surface-muted"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={{ uri }}
        contentFit="cover"
        cachePolicy="disk"
        transition={reduced ? 0 : FADE_MS}
        style={{ width: "100%", height: "100%" }}
        accessible={false}
      />
    </View>
  );
}
