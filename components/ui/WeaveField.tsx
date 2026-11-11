import { useEffect, useId, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

import { useColors } from "@/lib/colors";
import { ease, motion, useReduceMotion } from "@/lib/motion";

/** The banig weave: light warp strands and dark weft strands, 12 px each, on the indigo shell. */
function Weave() {
  const id = `weave-${useId()}`;
  return (
    <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
      <Defs>
        <Pattern id={id} width={24} height={24} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={12} height={24} fill="white" fillOpacity={0.045} />
          <Rect x={0} y={0} width={24} height={12} fill="black" fillOpacity={0.11} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** The stitch: gold and cream strands that weave in once, from the left. Shown at once with reduce motion on. */
export function StitchStrip() {
  const colors = useColors();
  const id = `stitch-${useId()}`;
  const reduced = useReduceMotion();
  const width = useSharedValue(reduced ? 100 : 0);
  useEffect(() => {
    width.set(reduced ? 100 : withTiming(100, { duration: motion.stitch, easing: ease }));
  }, [reduced, width]);
  const animated = useAnimatedStyle(() => ({ width: `${width.get()}%` }));

  return (
    <View className="h-stitch bg-shell" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ height: "100%", overflow: "hidden" }, animated]}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id={id} width={36} height={12} patternUnits="userSpaceOnUse">
              <Rect x={0} y={0} width={14} height={12} fill={colors.gold} />
              <Rect x={18} y={0} width={14} height={12} fill={colors.onShell} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

type WeaveFieldProps = {
  children: ReactNode;
  /** Padding and layout for the content, as class names. */
  className?: string;
  /** The stitch strip at the foot of the field. */
  strip?: boolean;
  /** The field grows to fill its parent, as on login. */
  fill?: boolean;
  /** Extra top space, such as the status bar height when the field reaches under it. */
  paddingTop?: number;
  marginTop?: number;
};

/** An indigo field with the banig weave, for login, the splash handover and the top of Home. */
export function WeaveField({ children, className = "", strip, fill, paddingTop, marginTop }: WeaveFieldProps) {
  return (
    <View className={fill ? "flex-1" : ""} style={{ marginTop }}>
      <View className={`overflow-hidden bg-shell ${className}`} style={{ paddingTop }}>
        <Weave />
        {children}
      </View>
      {strip ? <StitchStrip /> : null}
    </View>
  );
}
