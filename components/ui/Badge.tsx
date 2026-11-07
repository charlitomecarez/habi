import { Text } from "react-native";

type Tone = "danger" | "warning" | "neutral" | "good";

const classByTone: Record<Tone, string> = {
  danger: "text-over",
  warning: "text-watch",
  neutral: "text-ink-muted",
  good: "text-good",
};

/** A status word. Status is never shown by colour alone. */
export function Badge({ label, tone }: { label: string; tone: Tone }) {
  return <Text className={`self-start font-semibold text-badge ${classByTone[tone]}`}>{label}</Text>;
}
