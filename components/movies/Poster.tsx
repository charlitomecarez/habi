import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { motion } from "@/lib/motion";
import { posterUrl } from "@/lib/movies";

/**
 * A film poster at 2:3. A missing or failed poster shows the muted box with the first letter, so the
 * row never re-wraps. It is decorative: TalkBack reads the title only.
 */
export function Poster({ path, title, large = false }: { path: string | null; title: string; large?: boolean }) {
  const reduced = useReducedMotion();
  const uri = posterUrl(path, large ? "w342" : "w185");
  const [failed, setFailed] = useState(false);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`${large ? "h-poster w-tile" : "h-amount w-touch"} items-center justify-center overflow-hidden rounded-md border-2 border-border bg-surface-muted`}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          cachePolicy="disk"
          transition={reduced ? 0 : motion.fade}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%" }}
          accessible={false}
        />
      ) : (
        <Text maxFontSizeMultiplier={1.3} className="font-semibold text-title text-ink-muted">
          {title.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
