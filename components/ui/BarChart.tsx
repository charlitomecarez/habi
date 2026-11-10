import { Text, View } from "react-native";

type Tone = "good" | "watch" | "over";

const TONE_FILL: Record<Tone, string> = { good: "bg-good-fill", watch: "bg-watch-fill", over: "bg-over-fill" };
const GOAL_DASHES = 16;

type BarChartProps = {
  /** What the chart shows, for TalkBack. */
  label: string;
  /** A null value is a day ahead. It draws a flat line. */
  values: readonly (number | null)[];
  labels: readonly string[];
  /** The bar in the accent colour, usually today. */
  highlight?: number;
  /** One status for each bar, in the status colours. The row next to the chart says the same word. */
  tones?: readonly (Tone | undefined)[];
  /** A dashed line at this value, such as 7 hours of sleep. */
  goal?: number;
};

/** Bars of exact length, drawn with View, so it needs no chart library. */
export function BarChart({ label, values, labels, highlight, tones, goal }: BarChartProps) {
  const top = Math.max(...values.map((v) => v ?? 0), goal ?? 0, 1);
  return (
    <View accessible accessibilityLabel={label} className="gap-1">
      <View className="h-tile flex-row items-end gap-1">
        {values.map((value, index) => {
          if (value === null) return <View key={index} className="h-1 flex-1 bg-surface-muted" />;
          const tone = tones?.[index];
          const fill = tone ? TONE_FILL[tone] : index === highlight ? "bg-accent" : "bg-surface-muted";
          return <View key={index} className={`flex-1 ${fill}`} style={{ height: `${(value / top) * 100}%` }} />;
        })}
        {goal ? (
          // Dashes as small views: Android cannot draw a dashed border on one side.
          <View
            pointerEvents="none"
            className="absolute inset-x-0 flex-row justify-between"
            style={{ bottom: `${(goal / top) * 100}%` }}
          >
            {Array.from({ length: GOAL_DASHES }, (_, i) => (
              <View key={i} className="h-0.5 w-2 bg-ink-muted" />
            ))}
          </View>
        ) : null}
      </View>
      <View className="flex-row gap-1">
        {labels.map((text, index) => (
          <Text key={index} className="flex-1 text-center font-sans text-tab-label text-ink-muted">
            {text}
          </Text>
        ))}
      </View>
    </View>
  );
}
