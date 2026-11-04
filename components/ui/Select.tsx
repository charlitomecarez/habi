import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { OptionSheet } from "@/components/ui/OptionSheet";
import { useColors } from "@/lib/colors";

type SelectProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  optional?: boolean;
  error?: string;
};

/** A field that opens a sheet with one row per option. */
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder = "Choose",
  optional = false,
  error,
}: SelectProps<T>) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">
        {label}
        {optional ? <Text className="font-sans text-ink-muted"> (optional)</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "none"}`}
        onPress={() => setOpen(true)}
        className={`h-input flex-row items-center justify-between rounded-input border bg-surface-card px-4 ${error ? "border-danger" : "border-border-input"}`}
      >
        <Text
          numberOfLines={1}
          className={`flex-1 text-body ${selected ? "font-medium text-ink" : "font-sans text-ink-muted"}`}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.inkMuted} />
      </Pressable>
      {error ? <Text className="font-sans text-caption text-danger">{error}</Text> : null}

      <OptionSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        options={options}
        value={value}
        onChange={onChange}
      />
    </View>
  );
}
