import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Sheet } from "@/components/ui/Sheet";
import { colors } from "@/lib/colors";

type SelectProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
};

/** A field that opens a sheet with one row per option. */
export function Select<T extends string>({ label, options, value, onChange, placeholder = "Choose", error }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="gap-2">
      <Text className="font-medium text-label text-ink">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "none"}`}
        onPress={() => setOpen(true)}
        className={`h-input flex-row items-center justify-between rounded-input border bg-surface-card px-4 ${error ? "border-danger" : "border-border-input"}`}
      >
        <Text numberOfLines={1} className={`flex-1 text-body ${selected ? "font-medium text-ink" : "font-sans text-ink-muted"}`}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.inkMuted} />
      </Pressable>
      {error ? <Text className="font-sans text-caption text-danger">{error}</Text> : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
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
                  setOpen(false);
                }}
                className={`min-h-touch flex-row items-center justify-between px-4 py-3 active:bg-surface-muted ${index < options.length - 1 ? "border-b border-divider" : ""}`}
              >
                <Text className={`text-body ${isSelected ? "font-semibold text-ink" : "font-sans text-ink"}`}>{option.label}</Text>
                {isSelected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}
