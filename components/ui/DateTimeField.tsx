import { Ionicons } from "@expo/vector-icons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Pressable, Text, View } from "react-native";

import { useColors } from "@/lib/colors";

export type DateTimeFieldProps = {
  label: string;
  mode: "date" | "datetime";
  value: Date | null;
  onChange: (value: Date | null) => void;
};

export function formatFieldValue(value: Date, mode: DateTimeFieldProps["mode"]): string {
  return format(value, mode === "date" ? "MMM d, yyyy" : "MMM d, h:mm a");
}

/** Android: the system date dialog, then the time dialog for "datetime". */
export function DateTimeField({ label, mode, value, onChange }: DateTimeFieldProps) {
  const colors = useColors();
  function pick() {
    const start = value ?? new Date();
    DateTimePickerAndroid.open({
      value: start,
      mode: "date",
      onChange: (event, date) => {
        if (event.type !== "set" || !date) return;
        if (mode === "date") {
          onChange(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
          return;
        }
        DateTimePickerAndroid.open({
          value: start,
          mode: "time",
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== "set" || !time) return;
            onChange(new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes()));
          },
        });
      },
    });
  }

  return (
    <View className="min-w-0 flex-1 gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View className="h-input flex-row items-center rounded-input border border-border-input bg-surface-card">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? formatFieldValue(value, mode) : "none"}`}
          onPress={pick}
          className="h-full flex-1 justify-center pl-4"
        >
          <Text numberOfLines={1} className={`font-sans text-body ${value ? "text-ink" : "text-ink-muted"}`}>
            {value ? formatFieldValue(value, mode) : "None"}
          </Text>
        </Pressable>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            onPress={() => onChange(null)}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="close" size={18} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
