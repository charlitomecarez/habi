import { Text, View } from "react-native";

// Token pairs only. The same name always gets the same pair.
const TONES = [
  "bg-accent-tint text-accent-strong",
  "bg-warning-tint text-warning",
  "bg-danger-tint text-danger",
  "bg-surface-muted text-ink",
] as const;

function toneFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length];
}

/** The first letter of a name on a tinted square. Decoration only, so screen readers skip it. */
export function LetterAvatar({ name }: { name: string }) {
  const [bg, fg] = toneFor(name).split(" ");
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`h-chip w-chip items-center justify-center rounded-sm ${bg}`}
    >
      <Text className={`font-bold text-heading ${fg}`}>{(name.trim()[0] ?? "?").toUpperCase()}</Text>
    </View>
  );
}
