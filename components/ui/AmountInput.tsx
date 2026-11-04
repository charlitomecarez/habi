import { Text, TextInput, View, type TextInputProps } from "react-native";

import { useColors } from "@/lib/colors";

type AmountInputProps = Omit<TextInputProps, "className" | "style"> & {
  label: string;
  /** Unit shown inside the field, e.g. "km" or "₱". */
  unit: string;
  /** "start" for a currency sign before the number, "end" for a unit after it. */
  unitPosition?: "start" | "end";
  help?: string;
  error?: string;
};

/** The large number field for the one value a form is about. */
export function AmountInput({ label, unit, unitPosition = "end", help, error, ...props }: AmountInputProps) {
  const colors = useColors();
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View
        className={`h-amount flex-row items-center rounded-card border-2 bg-surface-card px-4 ${error ? "border-danger" : "border-accent"}`}
      >
        {unitPosition === "start" ? (
          <Text className="pr-2 font-bold text-amount-input text-ink-muted">{unit}</Text>
        ) : null}
        <TextInput
          accessibilityLabel={`${label} in ${unit}`}
          accessibilityHint={help}
          placeholderTextColor={colors.inkMuted}
          inputMode="numeric"
          keyboardType="number-pad"
          className="h-full min-w-0 flex-1 font-bold text-amount-input text-ink"
          {...props}
        />
        {unitPosition === "end" ? <Text className="pl-3 font-semibold text-title text-ink-muted">{unit}</Text> : null}
      </View>
      {error ? (
        <Text className="font-sans text-caption text-danger">{error}</Text>
      ) : help ? (
        <Text className="font-sans text-caption text-ink-muted">{help}</Text>
      ) : null}
    </View>
  );
}
