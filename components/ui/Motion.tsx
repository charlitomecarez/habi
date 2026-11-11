import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  FadeIn as FadeInAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/lib/motion";

/** A short fade when a list or section first shows. It does nothing with reduce motion on. */
export function FadeIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View entering={reduced ? undefined : FadeInAnimation.duration(motion.fade)} style={style}>
      {children}
    </Animated.View>
  );
}

type PressScaleProps = PressableProps & { className?: string; wrapperStyle?: StyleProp<ViewStyle> };

/** A Pressable that shrinks a little under the finger. It does nothing with reduce motion on. */
export function PressScale({ wrapperStyle, onPressIn, onPressOut, ...props }: PressScaleProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const press = (to: number) => {
    if (!reduced) scale.set(withTiming(to, { duration: motion.press }));
  };

  // NativeWind does not style Reanimated views, so the class goes on the Pressable inside.
  return (
    <Animated.View style={[wrapperStyle, animated]}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          press(motion.pressScale);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          press(1);
          onPressOut?.(event);
        }}
      />
    </Animated.View>
  );
}

/**
 * A number that counts to its new value when it changes on screen, such as a balance after a save.
 * The first value shows at once. With reduce motion on, every value shows at once.
 */
export function useCountTo(value: number): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (reduced || start === value) {
      setShown(value);
      return;
    }
    const began = Date.now();
    let frame = requestAnimationFrame(function step() {
      const t = Math.min(1, (Date.now() - began) / motion.count);
      // Ease out: a quick start with a soft stop.
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  return shown;
}
