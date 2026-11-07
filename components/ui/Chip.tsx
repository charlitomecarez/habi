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
  /** "filter" narrows a list (indigo when selected); "choice" picks a form value. */
  variant?: "choice" | "filter";
};

export function Chip({ label, selected, onPress, tone = "accent", variant = "choice" }: ChipProps) {
  const style =
    variant === "filter" ? { container: "border-accent bg-accent", label: "text-on-accent" } : selectedByTone[tone];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`h-touch items-center justify-center border px-4 ${variant === "filter" ? "rounded-md" : "rounded-pill"} ${selected ? style.container : "border-border-input bg-surface-card"}`}
    >
      <Text className={`text-label ${selected ? `font-semibold ${style.label}` : "font-sans text-ink"}`}>{label}</Text>
    </Pressable>
  );
}
