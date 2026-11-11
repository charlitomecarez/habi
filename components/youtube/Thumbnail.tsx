import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { durationText, thumbUrl } from "@/lib/youtube";

const FADE_MS = 150;

/**
 * A video thumbnail at 16:9, with the length on it when the feed gives one. A failed image keeps the
 * muted box, so the row never re-wraps. It is decorative: TalkBack reads the title only.
 */
export function Thumbnail({ videoId, seconds }: { videoId: string; seconds: number | null }) {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const length = durationText(seconds);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-thumb w-tile overflow-hidden rounded-md border-2 border-border bg-surface-muted"
    >
      {failed ? null : (
        <Image
          source={{ uri: thumbUrl(videoId) }}
          contentFit="cover"
          cachePolicy="disk"
          transition={reduced ? 0 : FADE_MS}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%" }}
          accessible={false}
        />
      )}
      {length ? (
        <View className="absolute bottom-1 right-1 rounded-sm bg-media-label px-1">
          <Text maxFontSizeMultiplier={1.3} className="font-semibold text-badge text-on-media-label">
            {length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
