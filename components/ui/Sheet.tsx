import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { useColors } from "@/lib/colors";
import { tick } from "@/lib/haptics";
import { motion, sheetSpring, useReduceMotion } from "@/lib/motion";

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Stays under the list and never scrolls, e.g. the save button of a long list. */
  footer?: ReactNode;
};

/** A drag past this share of the sheet, or a fast flick, closes it. */
const CLOSE_SHARE = 0.3;
const FLICK = 900;

/**
 * Bottom sheet for a short form (one or two fields) or a list to pick from. A sheet with a long list
 * puts its save button in `footer`, so it stays in view above the navigation bar. It rises on a
 * spring, and a drag down on the handle or the title closes it.
 */
export function Sheet({ visible, onClose, title, subtitle, children, footer }: SheetProps) {
  const colors = useColors();
  const reduced = useReduceMotion();
  const { height: screen } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(screen);
  const scrim = useSharedValue(0);
  const panelHeight = useSharedValue(screen);

  // Mount as soon as the sheet opens. It unmounts after the closing move ends.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    const fade = reduced ? motion.reduced : motion.fade;
    if (visible) {
      y.set(reduced ? 0 : withSpring(0, sheetSpring));
      scrim.set(withTiming(1, { duration: fade }));
    } else {
      const done = () => setMounted(false);
      scrim.set(withTiming(0, { duration: fade }));
      y.set(
        withTiming(screen, { duration: reduced ? 0 : motion.riseOut }, (finished) => {
          if (finished) runOnJS(done)();
        }),
      );
    }
  }, [visible, reduced, screen, scrim, y]);

  const close = () => {
    tick();
    onClose();
  };

  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((event) => {
      y.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > panelHeight.get() * CLOSE_SHARE || event.velocityY > FLICK) runOnJS(close)();
      else y.set(withSpring(0, sheetSpring));
    });

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* A Modal is a new window on Android, so it needs its own insets and its own gesture root. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {/* NativeWind does not style Reanimated views, so the classes go on the views inside. */}
          <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, scrimStyle]}>
            <View className="flex-1 bg-scrim" />
          </Animated.View>
          <KeyboardAvoidingView className="flex-1 justify-end">
            <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1" />
            <Animated.View
              style={[{ maxHeight: "100%" }, panelStyle]}
              onLayout={(event) => panelHeight.set(event.nativeEvent.layout.height)}
            >
              <View className="max-h-full rounded-t-sheet bg-surface-card">
                <SafeAreaView edges={["bottom"]} className="shrink">
                  <GestureDetector gesture={drag}>
                    <View>
                      <View className="items-center pt-3">
                        <View className="h-1 w-chip rounded-pill bg-border-input" />
                      </View>
                      <View className="flex-row items-center justify-between gap-3 px-5 pt-4">
                        <View className="flex-1 gap-1">
                          <Text accessibilityRole="header" className="font-bold text-title text-ink">
                            {title}
                          </Text>
                          {subtitle ? <Text className="font-sans text-caption text-ink-muted">{subtitle}</Text> : null}
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Close"
                          onPress={onClose}
                          className="h-touch w-touch items-center justify-center rounded-pill bg-surface-muted"
                        >
                          <Ionicons name="close" size={20} color={colors.ink} />
                        </Pressable>
                      </View>
                    </View>
                  </GestureDetector>
                  <ScrollView
                    className="shrink"
                    contentContainerClassName={`gap-5 px-5 pt-5 ${footer ? "pb-5" : "pb-8"}`}
                    keyboardShouldPersistTaps="handled"
                  >
                    {children}
                  </ScrollView>
                  {footer ? <View className="gap-3 border-t-2 border-border px-5 pb-3 pt-3">{footer}</View> : null}
                </SafeAreaView>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}
