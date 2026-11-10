import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/lib/colors";
import { weatherIcon } from "@/lib/weather";

/** The weather as a drawn icon. The word or the numbers beside it say the same thing, so TalkBack skips it. */
export function WeatherGlyph({ code, isDay, size }: { code?: number; isDay?: boolean; size: number }) {
  const colors = useColors();
  const name = weatherIcon(code, isDay);
  if (!name) return null;
  return <Ionicons name={name} size={size} color={colors.daily} accessibilityElementsHidden />;
}
