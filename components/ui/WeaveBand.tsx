import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { ease, motion } from "@/lib/motion";
import { weaveSummary, type Strand, type WeaveRow } from "@/lib/weave";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** Solid is good, split is watch, a dot is over. Each state has a shape, so it never relies on colour. */
function StrandCell({ state, today }: { state: Strand; today: boolean }) {
  const ring = today ? "border-2 border-on-shell" : "";
  if (state === "watch") {
    return (
      <View className={`h-strand justify-between ${ring}`}>
        <View className="h-1 bg-watch-fill" />
        <View className="h-1 bg-watch-fill" />
      </View>
    );
  }
  if (state === "over") {
    return (
      <View className={`h-strand items-center justify-center bg-over-fill ${ring}`}>
        <View className="h-1 w-1 rounded-pill bg-on-shell" />
      </View>
    );
  }
  return <View className={`h-strand ${state === "good" ? "bg-good-fill" : "bg-on-shell/20"} ${ring}`} />;
}

/** Today's strand weaves in from the left, once. Reduce motion shows it at once. */
function TodayStrand({ state }: { state: Strand }) {
  const reduced = useReducedMotion();
  const width = useSharedValue(reduced ? 100 : 0);
  useEffect(() => {
    width.set(reduced ? 100 : withTiming(100, { duration: motion.pushIn, easing: ease }));
  }, [reduced, width]);
  const animated = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  return (
    <Animated.View style={animated}>
      <StrandCell state={state} today />
    </Animated.View>
  );
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type WeaveBandProps = {
  rows: readonly WeaveRow[];
  /** 0 is Monday. */
  todayIndex: number;
  /** Opens a day. Each day is one tall column, because a strand alone is too small to tap. */
  onDayPress?: (dayIndex: number) => void;
};

/** The week as a mat: a row for each area of life, and a strand for each day. */
export function WeaveBand({ rows, todayIndex, onDayPress }: WeaveBandProps) {
  return (
    <View className="gap-1 px-4 pb-3 pt-1">
      <View>
        <View className="gap-1">
          {rows.map((row) => (
            <View
              key={row.label}
              accessible
              accessibilityLabel={weaveSummary(row)}
              className="flex-row items-center gap-1"
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
                className="w-slot font-sans text-tab-label text-on-shell"
              >
                {row.label}
              </Text>
              {row.days.map((state, index) => (
                <View key={index} className="flex-1">
                  {index === todayIndex ? <TodayStrand state={state} /> : <StrandCell state={state} today={false} />}
                </View>
              ))}
            </View>
          ))}
          <View className="flex-row gap-1">
            <View className="w-slot" />
            {DAY_LETTERS.map((letter, index) => (
              <Text
                key={`${letter}-${index}`}
                maxFontSizeMultiplier={1.3}
                className="flex-1 text-center font-sans text-tab-label text-on-shell"
              >
                {letter}
              </Text>
            ))}
          </View>
        </View>
        {onDayPress ? (
          <View className="absolute inset-0 flex-row gap-1">
            <View className="w-slot" />
            {DAY_NAMES.map((name, index) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`${name}, in words`}
                onPress={() => onDayPress(index)}
                className="min-h-touch flex-1"
              />
            ))}
          </View>
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={1.3} className="pt-1 font-sans text-tab-label text-on-shell">
        Solid: good · Split: watch · Dot: over
      </Text>
    </View>
  );
}
