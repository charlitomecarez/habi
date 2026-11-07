import { Pressable, Text } from "react-native";

type ModuleLineProps = {
  label: string;
  /** How much is inside, such as "12". */
  detail?: string;
  onPress: () => void;
};

/** A module on More or in the Home shortcuts: a name and how much is inside, two to a row. */
export function ModuleLine({ label, detail, onPress }: ModuleLineProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, detail].filter(Boolean).join(", ")}
      onPress={onPress}
      className="min-h-touch w-1/2 flex-row items-center justify-between gap-2 border-b-2 border-border py-2 pr-3 active:bg-surface-muted"
    >
      <Text className="min-w-0 shrink font-medium text-label text-ink">{label}</Text>
      {detail ? <Text className="font-sans text-caption text-ink-muted">{detail}</Text> : null}
    </Pressable>
  );
}
