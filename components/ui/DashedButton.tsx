import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text } from "react-native";

import { useColors } from "@/lib/colors";

type DashedButtonProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  /** "tall" stacks the icon over the label in a 112 px tile. */
  shape?: "tall" | "wide";
};

/** An empty slot to fill, such as "Take photo". */
export function DashedButton({ label, icon, onPress, shape = "wide" }: DashedButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-border-dashed bg-surface-card active:bg-surface-muted ${shape === "tall" ? "h-tile flex-1" : "h-slot flex-row"}`}
    >
      <Ionicons name={icon} size={shape === "tall" ? 24 : 20} color={colors.ink} />
      <Text className="font-medium text-label text-ink">{label}</Text>
    </Pressable>
  );
}
