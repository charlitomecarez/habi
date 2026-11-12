import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { tick } from "@/lib/haptics";
import { glideTiming, useReduceMotion } from "@/lib/motion";

type SegmentedProps<T extends string> = {
  label: string;
  /** `count` shows a small number after the label, such as the todos in Today. */
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
};

/** One choice from two to five. The card-coloured thumb glides to the choice. */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  const reduced = useReduceMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  // The row has 4 px padding and 4 px gaps, so each segment is (width - 8 - gaps) / n wide.
  const segment = width > 0 ? (width - 8 - 4 * (options.length - 1)) / options.length : 0;
  const x = useSharedValue(index * (segment + 4));

  useEffect(() => {
    const to = index * (segment + 4);
    x.set(reduced ? to : withTiming(to, glideTiming));
  }, [index, segment, reduced, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className="flex-row gap-1 rounded-md bg-surface-muted p-1"
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", top: 4, bottom: 4, left: 4, width: segment }, thumb]}
        >
          <View className="flex-1 rounded-sm bg-surface-card" />
        </Animated.View>
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.count === undefined ? option.label : `${option.label}, ${option.count}`}
            onPress={() => {
              if (selected) return;
              tick();
              onChange(option.value);
            }}
            className={`h-touch flex-1 flex-row items-center justify-center gap-1 rounded-sm ${
              selected && segment === 0 ? "bg-surface-card" : ""
            }`}
          >
            <Text className={`text-label ${selected ? "font-semibold text-ink" : "font-medium text-ink-muted"}`}>
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <Text className={`text-badge ${selected ? "font-semibold text-ink" : "font-medium text-ink-muted"}`}>
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
