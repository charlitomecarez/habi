import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TileGlyph } from "@/components/ui/ModuleTile";
import { useColors } from "@/lib/colors";
import { moduleForPath } from "@/lib/modules";
import { goBack } from "@/lib/navigation";

export type HeaderTone = "shell" | "daily" | "people" | "home" | "records";

/** The header is small after this much scroll. */
const SHRINK_AT = 48;

const TINT: Record<Exclude<HeaderTone, "shell">, string> = {
  daily: "bg-daily-tint",
  people: "bg-people-tint",
  home: "bg-home-tint",
  records: "bg-records-tint",
};

/**
 * The scroll position for a header that shrinks. Pass `onScroll` to an `Animated.ScrollView` or
 * `Animated.FlatList` with `scrollEventThrottle={16}`, and `scrollY` to the header.
 */
export function useHeaderScroll() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  return { scrollY, onScroll };
}

function BackButton({ label }: { label: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={goBack}
      className="h-touch w-touch items-center justify-center rounded-pill active:bg-surface-muted"
    >
      <Ionicons name="chevron-back" size={24} color={colors.ink} />
    </Pressable>
  );
}

type ModuleHeaderProps = {
  title: string;
  subtitle?: string;
  /** The colour of the module icon. The icon comes from the route. */
  tone?: HeaderTone;
  backLabel?: string;
  /** An icon button on the right. */
  action?: ReactNode;
  /** From `useHeaderScroll`. Without it, the header stays large. */
  scrollY?: SharedValue<number>;
};

/**
 * Cream, with the back button and a large title beside the module icon. On scroll it shrinks to a
 * bar with a small title and a 2 px rule. It reaches under the status bar.
 */
export function ModuleHeader({
  title,
  subtitle,
  tone = "shell",
  backLabel = "Back",
  action,
  scrollY,
}: ModuleHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const module = moduleForPath(usePathname());
  const still = useSharedValue(0);
  const offset = scrollY ?? still;
  const largeHeight = useSharedValue(0);

  const largeStyle = useAnimatedStyle(() => {
    const p = interpolate(offset.get(), [0, SHRINK_AT], [0, 1], "clamp");
    const full = largeHeight.get();
    return { opacity: 1 - p, height: full === 0 ? undefined : full * (1 - p) };
  });
  const smallStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get(), [SHRINK_AT * 0.6, SHRINK_AT], [0, 1], "clamp"),
  }));

  const iconTone = tone === "shell" ? module?.tone : tone;
  const iconColor = iconTone && iconTone !== "accent" ? colors[iconTone] : colors.accent;
  const iconTint = iconTone && iconTone !== "accent" ? TINT[iconTone] : "bg-surface-muted";

  return (
    <View className="bg-surface-page" style={{ marginTop: -insets.top, paddingTop: insets.top }}>
      <View className="min-h-touch flex-row items-center gap-1 px-2 pt-1">
        <BackButton label={backLabel} />
        {/* NativeWind does not style Reanimated views, so the classes go on the views inside. */}
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[{ flex: 1, minWidth: 0 }, smallStyle]}
        >
          <Text numberOfLines={1} className="font-bold text-heading text-ink">
            {title}
          </Text>
        </Animated.View>
        {action}
      </View>
      <Animated.View style={[{ overflow: "hidden" }, largeStyle]}>
        <View
          className="gap-1 px-5 pb-3"
          onLayout={(event) => {
            if (largeHeight.get() === 0) largeHeight.set(event.nativeEvent.layout.height);
          }}
        >
          <View className="flex-row items-center gap-3">
            {module ? (
              <View className={`h-10 w-10 items-center justify-center rounded-md ${iconTint}`}>
                <TileGlyph icon={module.icon} size={22} color={iconColor} />
              </View>
            ) : null}
            <Text accessibilityRole="header" className="min-w-0 flex-1 font-bold text-title-lg text-ink">
              {title}
            </Text>
          </View>
          {subtitle ? <Text className="font-sans text-label text-ink-muted">{subtitle}</Text> : null}
        </View>
      </Animated.View>
      <Animated.View style={smallStyle}>
        <View className="h-0.5 bg-border" />
      </Animated.View>
    </View>
  );
}

/** The same cream bar for a screen that lays out its own title and buttons. */
export function ModuleBar({
  backLabel = "Back",
  children,
}: {
  /** Kept for old callers. The bar is cream for every tone. */
  tone?: HeaderTone;
  backLabel?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center gap-1 bg-surface-page px-2 pb-2"
      style={{ marginTop: -insets.top, paddingTop: insets.top + 4 }}
    >
      <BackButton label={backLabel} />
      {children}
    </View>
  );
}

/**
 * The indigo field of a tab: the number that matters, then one line. It reaches under the status
 * bar. With `scrollY`, the number shrinks from display to title size as you scroll.
 */
export function TabField({
  lead,
  detail,
  children,
  scrollY,
}: {
  lead: string;
  detail?: string;
  children?: ReactNode;
  scrollY?: SharedValue<number>;
}) {
  const insets = useSafeAreaInsets();
  const still = useSharedValue(0);
  const offset = scrollY ?? still;
  // Title (20) over display (34): the lead scales down from its left edge.
  const leadStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(offset.get(), [0, SHRINK_AT], [1, 20 / 34], "clamp") }],
  }));
  return (
    <View className="gap-1 bg-shell px-5 pb-4" style={{ marginTop: -insets.top, paddingTop: insets.top + 16 }}>
      <Animated.View style={[{ transformOrigin: "left center" }, leadStyle]}>
        <Text
          accessibilityRole="header"
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
          className="font-bold text-display text-on-shell"
        >
          {lead}
        </Text>
      </Animated.View>
      {detail ? <Text className="font-sans text-label text-on-shell-muted">{detail}</Text> : null}
      {children}
    </View>
  );
}
