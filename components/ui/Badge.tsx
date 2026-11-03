import { Text } from "react-native";

type Tone = "danger" | "warning" | "neutral";

const classByTone: Record<Tone, string> = {
  danger: "bg-danger-tint text-danger",
  warning: "bg-warning-tint text-warning",
  neutral: "bg-surface-muted text-ink-muted",
};

/** A status word. Status is never shown by colour alone. */
export function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Text className={`self-start overflow-hidden rounded-pill px-2 py-1 font-semibold text-badge ${classByTone[tone]}`}>
      {label}
    </Text>
  );
}
