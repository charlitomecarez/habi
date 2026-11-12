import { View } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

import { useColors } from "@/lib/colors";
import type { Ulam } from "@/lib/ulam";

/** A simple bundled picture for each kind of dish. It shows when a dish has no photo. */
export function UlamPicture({ kind, size = 112 }: { kind: Ulam["kind"]; size?: number }) {
  const colors = useColors();
  const line = { stroke: colors.ink, strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    // The hiding props go on a View. On the web, react-native-svg hands them to the <svg> tag, and React warns.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={52} fill={colors.surfaceCard} {...line} />
        <Circle cx={60} cy={60} r={40} fill="none" stroke={colors.border} strokeWidth={2} />
        {kind === "egg" && (
          <>
            <Path d="M36 62c0-16 12-26 24-26s26 8 26 24-14 26-28 26-22-10-22-24z" fill={colors.surfacePage} {...line} />
            <Circle cx={60} cy={60} r={11} fill={colors.daily} />
          </>
        )}
        {kind === "vegetable" && (
          <>
            <Path d="M60 88C38 80 34 56 44 38c12 6 20 24 16 50z" fill={colors.accent} {...line} />
            <Path d="M60 88c22-8 26-30 16-48-12 6-20 22-16 48z" fill={colors.accent} {...line} />
            <Path d="M50 54l10 34 10-32" fill="none" {...line} />
          </>
        )}
        {kind === "beans" && (
          <>
            <Ellipse cx={46} cy={50} rx={9} ry={6} fill={colors.accent} {...line} />
            <Ellipse cx={72} cy={46} rx={9} ry={6} fill={colors.accent} {...line} />
            <Ellipse cx={60} cy={62} rx={9} ry={6} fill={colors.daily} {...line} />
            <Ellipse cx={42} cy={72} rx={9} ry={6} fill={colors.daily} {...line} />
            <Ellipse cx={76} cy={72} rx={9} ry={6} fill={colors.accent} {...line} />
          </>
        )}
        {kind === "fish" && (
          <>
            <Path d="M32 60c10-14 34-18 48 0-14 18-38 14-48 0z" fill={colors.home} {...line} />
            <Path d="M80 60l12-11v22z" fill={colors.home} {...line} />
            <Circle cx={44} cy={57} r={2.5} fill={colors.surfaceCard} />
          </>
        )}
        {kind === "meat" && (
          <>
            <Path d="M38 66c-4-18 12-30 28-28 14 2 22 14 18 26-4 14-40 18-46 2z" fill={colors.people} {...line} />
            <Circle cx={62} cy={58} r={7} fill={colors.surfaceCard} {...line} />
          </>
        )}
        {kind === "soup" && (
          <>
            <Path d="M34 58h52a26 26 0 01-52 0z" fill={colors.daily} {...line} />
            <Rect x={46} y={82} width={28} height={4} rx={2} fill={colors.ink} />
            <Path d="M50 48c-4-5 4-7 0-13M60 48c-4-5 4-7 0-13M70 48c-4-5 4-7 0-13" fill="none" {...line} />
          </>
        )}
      </Svg>
    </View>
  );
}
