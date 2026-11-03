import { format, parse } from "date-fns";
import { Text, View } from "react-native";

import type { DateTimeFieldProps } from "./DateTimeField";

const FORMATS = { date: "yyyy-MM-dd", datetime: "yyyy-MM-dd'T'HH:mm" } as const;

/** Web: the browser's own date or date-and-time input. */
export function DateTimeField({ label, mode, value, onChange }: DateTimeFieldProps) {
  const inputId = `field-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <View className="min-w-0 flex-1 gap-2">
      <Text className="font-medium text-label text-ink">
        <label htmlFor={inputId}>{label}</label>
      </Text>
      <input
        id={inputId}
        type={mode === "date" ? "date" : "datetime-local"}
        value={value ? format(value, FORMATS[mode]) : ""}
        onChange={(event) => {
          const text = event.target.value;
          onChange(text ? parse(text, FORMATS[mode], new Date()) : null);
        }}
        className="h-input min-w-0 rounded-input border border-border-input bg-surface-card px-4 font-sans text-body text-ink"
      />
    </View>
  );
}
