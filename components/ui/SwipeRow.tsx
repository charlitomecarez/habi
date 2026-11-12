import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import type { RowAction } from "@/components/ui/DataRow";
import { useColors } from "@/lib/colors";
import { tick } from "@/lib/haptics";
import { sheetSpring } from "@/lib/motion";

/** The width of one action button. */
const ACTION_WIDTH = 76;
/** A swipe past this share of the row fires the first action. */
const FIRE_SHARE = 0.6;

const BG: Record<RowAction["tone"], string> = { primary: "bg-accent", destructive: "bg-danger" };

/**
 * A row with actions behind a left swipe. A short swipe opens them, a long swipe fires the first
 * one with a tick, and a right swipe on an open row closes it. DataRow gives TalkBack each action
 * as a custom action, so no swipe is needed.
 */
export function SwipeRow({ actions, children }: { actions: readonly RowAction[]; children: ReactNode }) {
  const colors = useColors();
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const width = useSharedValue(0);
  const passed = useSharedValue(false);
  const open = ACTION_WIDTH * actions.length;

  const fire = () => actions[0].onPress();

  const pan = Gesture.Pan()
    // Only a left swipe starts it, or a right swipe while it is open, so a drag back still works.
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      start.set(x.get());
    })
    .onUpdate((event) => {
      const next = Math.min(0, start.get() + event.translationX);
      x.set(next);
      const past = -next > width.get() * FIRE_SHARE;
      if (past !== passed.get()) {
        passed.set(past);
        if (past) runOnJS(tick)();
      }
    })
    .onEnd((event) => {
      if (passed.get()) {
        passed.set(false);
        x.set(withSpring(0, sheetSpring));
        runOnJS(fire)();
        return;
      }
      const opening = x.get() < -open / 2 && event.velocityX < 600;
      x.set(withSpring(opening ? -open : 0, sheetSpring));
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const close = () => x.set(withSpring(0, sheetSpring));

  return (
    <View onLayout={(event) => width.set(event.nativeEvent.layout.width)}>
      <View className="absolute bottom-0 right-0 top-0 flex-row">
        {actions.map((action) => (
          <Pressable
            key={action.label}
            // TalkBack reaches these through the row's custom actions, so the buttons stay out of its order.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onPress={() => {
              close();
              action.onPress();
            }}
            style={{ width: ACTION_WIDTH }}
            className={`items-center justify-center gap-1 ${BG[action.tone]}`}
          >
            <Ionicons name={action.icon} size={22} color={colors.onAccent} />
            <Text className="font-semibold text-badge text-on-accent">{action.label}</Text>
          </Pressable>
        ))}
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>
          <View className="bg-surface-page">{children}</View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
