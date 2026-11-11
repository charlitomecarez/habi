import Svg, { Path, Rect } from "react-native-svg";

import { useColors } from "@/lib/colors";

type HabiMarkProps = {
  size?: number;
  /** "indigo" on a light page. "reverse" on the indigo shell: a cream tile with indigo squares. */
  tone?: "indigo" | "reverse";
  /** The mark is a picture of the name, so a screen reader hears "Habi". Set false when the name is beside it. */
  label?: boolean;
};

/** The Habi mark: four squares on a tile, the fourth in gold with a tick. */
export function HabiMark({ size = 48, tone = "indigo", label = true }: HabiMarkProps) {
  const colors = useColors();
  const tile = tone === "indigo" ? colors.shell : colors.onShell;
  const square = tone === "indigo" ? colors.onShell : colors.shell;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      accessible={label}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label ? "Habi" : undefined}
    >
      <Rect width={32} height={32} rx={8} fill={tile} />
      <Rect x={7} y={7} width={8} height={8} rx={2} fill={square} />
      <Rect x={17} y={7} width={8} height={8} rx={2} fill={square} />
      <Rect x={7} y={17} width={8} height={8} rx={2} fill={square} />
      <Rect x={17} y={17} width={8} height={8} rx={2} fill={colors.gold} />
      <Path
        d="M19 21l1.6 1.6 2.9-3.1"
        stroke={colors.shell}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
