import { Text, View } from "react-native";
import Svg, { Path, SvgXml } from "react-native-svg";

import { LetterAvatar } from "@/components/ui/LetterAvatar";
import { findBrand } from "@/lib/brands";

/**
 * The brand's logo when the name is a known brand, for example "Netflix Premium" or "GCASH".
 * Other names get the letter square. Logos are bundled; nothing is downloaded, so the Vault can use it.
 * Each logo sits on a white tile with a border, so dark logos still show in dark mode.
 * Decoration only: the name next to it stays as text, so screen readers skip it.
 */
/** `hint` is a second place to look, for example a Vault entry's URL ("netflix.com"). */
export function BrandIcon({ name, hint }: { name: string; hint?: string | null }) {
  const brand = findBrand(name) ?? findBrand(hint);
  if (!brand || (!brand.svg && !brand.path && !brand.color)) return <LetterAvatar name={name} />;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-chip w-chip items-center justify-center rounded-sm border border-border bg-brand-tile"
    >
      {brand.svg ? (
        <SvgXml xml={brand.svg} width={24} height={24} />
      ) : brand.path ? (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          {/* Brand colour comes from lib/brands/data.ts, not from the design tokens. */}
          <Path d={brand.path} fill={brand.color ?? "#000000"} />
        </Svg>
      ) : (
        <Text className="font-bold text-heading" style={{ color: brand.color ?? undefined }}>
          {brand.name.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
