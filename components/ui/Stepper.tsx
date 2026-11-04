import { Pressable, Text, TextInput, View } from "react-native";

type StepperProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  error?: string;
};

/** A whole-number field with − and + buttons. */
export function Stepper({ label, value, onChange, min = 0, error }: StepperProps) {
  const current = /^\d+$/.test(value.trim()) ? Number(value.trim()) : min;
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View
        className={`h-input flex-row items-center justify-between rounded-input border bg-surface-card px-1 ${error ? "border-danger" : "border-border-input"}`}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          disabled={current <= min}
          onPress={() => onChange(String(Math.max(min, current - 1)))}
          className={`h-touch w-touch items-center justify-center ${current <= min ? "opacity-40" : ""}`}
        >
          <Text className="font-semibold text-title text-ink">−</Text>
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={5}
          className="h-full min-w-0 flex-1 text-center font-semibold text-body text-ink"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          onPress={() => onChange(String(current + 1))}
          className="h-touch w-touch items-center justify-center"
        >
          <Text className="font-semibold text-title text-ink">+</Text>
        </Pressable>
      </View>
      {error ? <Text className="font-sans text-caption text-danger">{error}</Text> : null}
    </View>
  );
}
