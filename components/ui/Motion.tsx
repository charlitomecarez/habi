import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  FadeIn as FadeInAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const FADE_MS = 180;
const PRESS_MS = 90;
const PRESS_SCALE = 0.97;

/** A short fade when a list or section first shows. It does nothing with reduce motion on. */
export function FadeIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View entering={reduced ? undefined : FadeInAnimation.duration(FADE_MS)} style={style}>
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
    if (!reduced) scale.set(withTiming(to, { duration: PRESS_MS }));
  };

  // NativeWind does not style Reanimated views, so the class goes on the Pressable inside.
  return (
    <Animated.View style={[wrapperStyle, animated]}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          press(PRESS_SCALE);
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
