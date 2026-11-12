import { useEffect, type ReactNode } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/lib/motion";

// One slow pulse: opacity 1 to 0.5 and back, 1.1 seconds each way. Still with reduce motion on.
const LOW = 0.5;

type Surface = "page" | "card";
// On the page the shapes are surface-muted; inside a card, divider, so they still show.
const FILL: Record<Surface, string> = { page: "bg-surface-muted", card: "bg-divider" };

/** A text-shaped bar. `width` is a share such as "60%". */
function Line({ width = "100%", surface = "page" }: { width?: DimensionValue; surface?: Surface }) {
  return <View className={`h-4 rounded-sm ${FILL[surface]}`} style={{ width }} />;
}

/** A block for a chart, a photo or a number. Give it a height class such as "h-slot". */
function Block({ className = "h-slot", surface = "page" }: { className?: string; surface?: Surface }) {
  return <View className={`w-full rounded-md ${FILL[surface]} ${className}`} />;
}

/** A row with the height of a DataRow and the same 2 px rule, so nothing jumps when rows arrive. */
function Row({ width = "60%" }: { width?: DimensionValue }) {
  return (
    <View className="min-h-touch flex-row items-center justify-between gap-3 border-b-2 border-border py-3">
      <View className="flex-1 gap-2">
        <Line width={width} />
        <View className="h-3 w-2/5 rounded-sm bg-surface-muted" />
      </View>
      <View className="h-5 w-chip rounded-sm bg-surface-muted" />
    </View>
  );
}

const ROW_WIDTHS: DimensionValue[] = ["70%", "55%", "64%", "48%", "60%", "52%", "66%", "58%"];

function Layout({ layout, rows }: { layout: SkeletonLayout; rows: number }) {
  const list = Array.from({ length: rows }, (_, i) => <Row key={i} width={ROW_WIDTHS[i % ROW_WIDTHS.length]} />);
  switch (layout) {
    case "detail":
      return (
        <View className="gap-4">
          <Line width="45%" />
          <Block className="h-amount" />
          <View>{list}</View>
        </View>
      );
    case "grid":
      return (
        <View className="flex-row flex-wrap">
          {Array.from({ length: rows * 2 }, (_, i) => (
            <View key={i} className="min-h-touch w-1/2 flex-row items-center gap-2 border-b-2 border-border py-2 pr-3">
              <View className="h-5 w-5 rounded-sm bg-surface-muted" />
              <Line width={ROW_WIDTHS[i % ROW_WIDTHS.length]} />
            </View>
          ))}
        </View>
      );
    case "home":
      return (
        <View className="gap-4">
          <Line width="55%" />
          <Line width="35%" />
          <Block className="h-amount" />
          <View>{list}</View>
        </View>
      );
    default:
      return <View>{list}</View>;
  }
}

export type SkeletonLayout = "list" | "detail" | "grid" | "home";

type SkeletonProps = {
  /** The shape of the filled screen. */
  layout?: SkeletonLayout;
  /** Rows to draw. Pick about what fits one screen. */
  rows?: number;
  /** Custom shapes from Skeleton.Line and Skeleton.Block, in place of a layout. */
  children?: ReactNode;
};

/**
 * A placeholder in the shape of a screen while its data loads. TalkBack hears "Loading" once,
 * and the shapes are hidden from it. A button keeps its own spinner.
 */
export function Skeleton({ layout = "list", rows = 6, children }: SkeletonProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    opacity.set(withRepeat(withTiming(LOW, { duration: motion.pulse, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity, reduced]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    // When the data arrives, the skeleton fades out where it was while the content fades in over it.
    <Animated.View
      exiting={reduced ? undefined : FadeOut.duration(motion.fade)}
      accessible
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    >
      <Animated.View style={pulse}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {children ?? <Layout layout={layout} rows={rows} />}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

Skeleton.Line = Line;
Skeleton.Block = Block;
