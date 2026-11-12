import type { StackCardStyleInterpolator, StackNavigationOptions } from "expo-router/js-stack";
import { Easing } from "react-native";

import { motion } from "@/lib/motion";

// The JS stack animates with React Native's Animated, so it takes the Animated easing, not Reanimated's.
const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const timing = (duration: number) => ({ animation: "timing" as const, config: { duration, easing: ease } });

/** Reduce motion: a short crossfade. */
export const fadeStyle: StackCardStyleInterpolator = ({ current }) => ({ cardStyle: { opacity: current.progress } });

/** A short crossfade for reduce motion and for the web. */
export const fadeOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyleInterpolator: fadeStyle,
  transitionSpec: { open: timing(motion.reduced), close: timing(motion.reduced) },
};
