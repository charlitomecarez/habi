import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";

/** A team's crest, or its short code when it has none or the crest cannot load. The name is always beside it. */
export function TeamMark({ crest, code }: { crest: string | null; code: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showCrest = crest !== null && crest !== failedUrl;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-6 w-8 items-center justify-center"
    >
      {showCrest ? (
        <Image
          source={{ uri: crest }}
          cachePolicy="disk"
          contentFit="contain"
          onError={() => setFailedUrl(crest)}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
      ) : code ? (
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} className="font-semibold text-badge text-ink-muted">
          {code}
        </Text>
      ) : null}
    </View>
  );
}
