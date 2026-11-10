import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { Sheet } from "@/components/ui/Sheet";
import { useColors } from "@/lib/colors";

export type SheetOption<T extends string> = {
  value: T;
  label: string;
  /** A second line under the label, such as why an option is off. */
  detail?: string;
  /** Shown but not pickable. Give the reason in `detail`. */
  disabled?: boolean;
};

type OptionSheetProps<T extends string> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: readonly SheetOption<T>[];
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
          const off = option.disabled === true;
          const label = [option.label, off ? "not available" : null, option.detail].filter(Boolean).join(", ");
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: isSelected, disabled: off }}
              disabled={off}
              onPress={() => {
                onChange(option.value);
                onClose();
              }}
              className={`min-h-touch flex-row items-center justify-between gap-3 py-3 ${off ? "" : "active:bg-surface-muted"} ${index < options.length - 1 ? "border-b-2 border-border" : ""}`}
            >
              <View className="min-w-0 flex-1 gap-1">
                <Text
                  className={`text-body ${isSelected ? "font-semibold text-ink" : "font-sans text-ink"} ${off ? "opacity-50" : ""}`}
                >
                  {option.label}
                </Text>
                {option.detail ? <Text className="font-sans text-caption text-ink-muted">{option.detail}</Text> : null}
              </View>
              {isSelected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
