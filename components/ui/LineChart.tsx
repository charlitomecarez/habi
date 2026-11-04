import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { useColors } from "@/lib/colors";

type Point = { date: string; value: number };

type LineChartProps = {
  points: Point[];
  /** How a value reads, e.g. "72.4 kg". */
  format: (value: number) => string;
  /** Read out by screen readers, e.g. "Weight". */
  label: string;
};

const HEIGHT = 180;
const PAD = { top: 16, right: 16, bottom: 28, left: 48 };

/**
 * A line over time, drawn to scale on both axes: x by days, y from the lowest to the highest value
 * with a little room. The latest point is emphasised. Colours come from the theme.
 */
export function LineChart({ points, format: fmt, label }: LineChartProps) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 2) {
    return (
      <View className="rounded-input border border-dashed border-border-dashed p-4">
        <Text className="font-sans text-caption text-ink-muted">
          {sorted.length === 0 ? "No entries yet." : `One entry: ${fmt(sorted[0].value)}. Add another to see the line.`}
        </Text>
      </View>
    );
  }

  const first = parseISO(sorted[0].date);
  const span = Math.max(1, differenceInCalendarDays(parseISO(sorted[sorted.length - 1].date), first));
  const values = sorted.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.15, 0.5);
  const yMin = lo - pad;
  const yMax = hi + pad;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (date: string) => PAD.left + (differenceInCalendarDays(parseISO(date), first) / span) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const line = sorted.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(sorted[sorted.length - 1].date).toFixed(1)},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`;
  const last = sorted[sorted.length - 1];
  const ticks = [lo, (lo + hi) / 2, hi];

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`${label}: from ${fmt(sorted[0].value)} on ${format(first, "MMM d")} to ${fmt(last.value)} on ${format(parseISO(last.date), "MMM d")}. Lowest ${fmt(lo)}, highest ${fmt(hi)}.`}
    >
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {ticks.map((t) => (
            <Line
              key={`g${t}`}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {ticks.map((t) => (
            <SvgText key={`t${t}`} x={PAD.left - 8} y={y(t) + 4} fontSize={11} fill={colors.inkMuted} textAnchor="end">
              {fmt(t)}
            </SvgText>
          ))}
          <SvgText x={PAD.left} y={HEIGHT - 8} fontSize={11} fill={colors.inkMuted} textAnchor="start">
            {format(first, "MMM d")}
          </SvgText>
          <SvgText x={width - PAD.right} y={HEIGHT - 8} fontSize={11} fill={colors.inkMuted} textAnchor="end">
            {format(parseISO(last.date), "MMM d")}
          </SvgText>
          <Path d={area} fill={colors.accent} fillOpacity={0.1} />
          <Path
            d={line}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle
            cx={x(last.date)}
            cy={y(last.value)}
            r={5}
            fill={colors.accent}
            stroke={colors.surfaceCard}
            strokeWidth={2}
          />
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
    </View>
  );
}
