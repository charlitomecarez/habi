import type { StackCardStyleInterpolator, StackNavigationOptions } from "expo-router/js-stack";
import { Dimensions } from "react-native";

import { motion } from "@/lib/motion";
import { fadeOptions, timing } from "@/lib/transitions.shared";

const RISE_DRAG_AREA = 120;

/** The new screen slides in from the right. The old screen moves a quarter left and dims. */
const pushStyle: StackCardStyleInterpolator = ({ current, next, layouts }) => {
  const width = layouts.screen.width;
  const enter = current.progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0], extrapolate: "clamp" });
  const leave = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -motion.pushShift * width],
        extrapolate: "clamp",
      })
    : 0;
  return {
    cardStyle: { transform: [{ translateX: enter }, { translateX: leave }] },
    overlayStyle: { opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, motion.pushDim] }) },
  };
};

/** A full-screen form rises from the bottom. The screen under it dims. */
const riseStyle: StackCardStyleInterpolator = ({ current, layouts }) => ({
  cardStyle: {
    transform: [
      {
        translateY: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [layouts.screen.height, 0],
          extrapolate: "clamp",
        }),
      },
    ],
  },
  overlayStyle: { opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, motion.pushDim] }) },
});

/** Options for every screen in the app stack. */
export function pushOptions(reduced: boolean): StackNavigationOptions {
  if (reduced) return { ...fadeOptions, gestureEnabled: true };
  return {
    headerShown: false,
    gestureEnabled: true,
    gestureDirection: "horizontal",
    // A right swipe anywhere on the screen drags back, not only from the edge.
    gestureResponseDistance: Dimensions.get("window").width,
    cardOverlayEnabled: true,
    cardStyleInterpolator: pushStyle,
    transitionSpec: { open: timing(motion.pushIn), close: timing(motion.pushOut) },
  };
}

/** Options for a full-screen form: it rises, and a drag down from the top closes it. */
export function riseOptions(reduced: boolean): StackNavigationOptions {
  if (reduced) return pushOptions(true);
  return {
    gestureEnabled: true,
    gestureDirection: "vertical",
    // The top of the form, where the bar is, so the drag does not fight the form's scroll.
    gestureResponseDistance: RISE_DRAG_AREA,
    cardOverlayEnabled: true,
    cardStyleInterpolator: riseStyle,
    transitionSpec: { open: timing(motion.riseIn), close: timing(motion.riseOut) },
  };
}
