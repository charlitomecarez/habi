import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { Sheet } from "@/components/ui/Sheet";
import { useColors } from "@/lib/colors";

type OptionSheetProps<T extends string> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
};

/** A sheet with one row per option. Picking a row closes it. */
export function OptionSheet<T extends string>({
  visible,
  onClose,
  title,
  subtitle,
  options,
  value,
  onChange,
}: OptionSheetProps<T>) {
  const colors = useColors();
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <View accessibilityRole="radiogroup" className="overflow-hidden rounded-card border border-border">
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => {
                onChange(option.value);
                onClose();
              }}
              className={`min-h-touch flex-row items-center justify-between py-3 active:bg-surface-muted ${index < options.length - 1 ? "border-b-2 border-border" : ""}`}
            >
              <Text className={`text-body ${isSelected ? "font-semibold text-ink" : "font-sans text-ink"}`}>
                {option.label}
              </Text>
              {isSelected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
