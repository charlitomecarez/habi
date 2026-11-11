import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { useEffect } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/lib/colors";
import { motion, useReduceMotion } from "@/lib/motion";
import { useSnackbarStore } from "@/lib/snackbar";

const TAB_ROUTES = new Set(["/", "/money", "/todos", "/vehicle", "/more"]);
/** The tab bar: a 32 px pill row, its label and its padding, so the snackbar sits just above it. */
const TAB_BAR_CLEARANCE = 72;

/** Shows the current snackbar message. It lives once, in the app layout. */
export function SnackbarHost() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const pathname = usePathname();
  const message = useSnackbarStore((s) => s.message);
  const hide = useSnackbarStore((s) => s.hide);

  useEffect(() => {
    if (!message) return;
    AccessibilityInfo.announceForAccessibility(message.text);
    if (message.tone === "error") return;
    const timer = setTimeout(hide, motion.snackbar);
    return () => clearTimeout(timer);
  }, [message, hide]);

  if (!message) return null;
  const error = message.tone === "error";
  const bottom = insets.bottom + 12 + (TAB_ROUTES.has(pathname) ? TAB_BAR_CLEARANCE : 0);

  return (
    <Animated.View
      key={message.id}
      entering={reduced ? FadeIn.duration(motion.reduced) : SlideInDown.duration(motion.riseIn)}
      exiting={reduced ? FadeOut.duration(motion.reduced) : SlideOutDown.duration(motion.riseOut)}
      style={{ position: "absolute", left: 12, right: 12, bottom }}
      pointerEvents="box-none"
    >
      <View
        // The host announces the text once, so the view sets no live region.
        accessibilityRole={error ? "alert" : undefined}
        className="min-h-touch flex-row items-center gap-2 rounded-input bg-ink pl-4"
      >
        <Text className="flex-1 py-3 font-medium text-label text-surface-page">{message.text}</Text>
        {message.actionLabel ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              hide();
              message.onAction?.();
            }}
            className="h-touch justify-center px-3"
          >
            <Text className="font-bold text-label text-surface-page underline">{message.actionLabel}</Text>
          </Pressable>
        ) : null}
        {error || !message.actionLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={hide}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="close" size={20} color={colors.surfacePage} />
          </Pressable>
        ) : (
          <View className="w-2" />
        )}
      </View>
    </Animated.View>
  );
}
