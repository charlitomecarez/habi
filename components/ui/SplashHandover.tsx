import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { HabiMark } from "@/components/ui/HabiMark";
import { StitchStrip, WeaveField } from "@/components/ui/WeaveField";
import { motion, useReduceMotion } from "@/lib/motion";

/** The native splash's size for the mark (app.json imageWidth), so the handover starts where it ends. */
const MARK_SIZE = 96;

/**
 * Takes over from the native splash: the same mark on the weave. The mark fades, the strip
 * stitches across, then the app fades in. With reduce motion on, the app shows at once.
 */
export function SplashHandover({ onDone }: { onDone: () => void }) {
  const reduced = useReduceMotion();
  const mark = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    mark.set(
      withDelay(
        motion.stitch,
        withTiming(0, { duration: motion.fade }, (finished) => {
          if (finished) runOnJS(onDone)();
        }),
      ),
    );
  }, [reduced, mark, onDone]);
  const markStyle = useAnimatedStyle(() => ({ opacity: mark.get() }));

  if (reduced) return null;
  return (
    <Animated.View
      exiting={FadeOut.duration(motion.fade)}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <WeaveField fill className="flex-1 items-center justify-center">
        <Animated.View style={markStyle}>
          <HabiMark size={MARK_SIZE} tone="reverse" label={false} />
        </Animated.View>
      </WeaveField>
      <View className="absolute bottom-0 left-0 right-0">
        <StitchStrip />
      </View>
    </Animated.View>
  );
}
