import { Text, View } from "react-native";

type BarChartProps = {
  /** What the chart shows, for TalkBack. */
  label: string;
  values: readonly number[];
  labels: readonly string[];
  /** The bar in the accent colour, usually today. */
  highlight?: number;
};

/** Bars of exact length, drawn with View, so it needs no chart library. */
export function BarChart({ label, values, labels, highlight }: BarChartProps) {
  const top = Math.max(...values, 1);
  return (
    <View accessible accessibilityLabel={label} className="gap-1">
      <View className="h-tile flex-row items-end gap-1">
        {values.map((value, index) => (
          <View
            key={index}
            className={`flex-1 ${index === highlight ? "bg-accent" : "bg-surface-muted"}`}
            style={{ height: `${(value / top) * 100}%` }}
          />
        ))}
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
