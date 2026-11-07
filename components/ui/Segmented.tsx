import { Pressable, Text, View } from "react-native";

type SegmentedProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      className="flex-row gap-1 rounded-md bg-surface-muted p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`h-touch flex-1 items-center justify-center rounded-sm ${selected ? "bg-surface-card" : ""}`}
          >
            <Text className={`text-label ${selected ? "font-semibold text-ink" : "font-medium text-ink-muted"}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
