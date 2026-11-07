import { Pressable, Text } from "react-native";

type Tone = "accent" | "danger";

const selectedByTone: Record<Tone, { container: string; label: string }> = {
  accent: { container: "border-accent bg-accent-tint", label: "text-accent-strong" },
  danger: { container: "border-danger bg-danger-tint", label: "text-danger" },
};

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: Tone;
  /** "filter" narrows a list (dark when selected); "choice" picks a form value. */
  variant?: "choice" | "filter";
};

export function Chip({ label, selected, onPress, tone = "accent", variant = "choice" }: ChipProps) {
  const style =
    variant === "filter" ? { container: "border-ink bg-ink", label: "text-surface-card" } : selectedByTone[tone];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`h-touch items-center justify-center rounded-pill border px-4 ${selected ? style.container : "border-border-input bg-surface-card"}`}
    >
      <Text className={`text-label ${selected ? `font-semibold ${style.label}` : "font-sans text-ink"}`}>{label}</Text>
    </Pressable>
  );
}
