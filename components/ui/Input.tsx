import { Text, TextInput, View, type TextInputProps } from "react-native";

import { useColors } from "@/lib/colors";

type InputProps = Omit<TextInputProps, "className" | "style"> & {
  label: string;
  optional?: boolean;
  error?: string;
};

export function Input({ label, optional = false, error, multiline, ...props }: InputProps) {
  const colors = useColors();
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">
        {label}
        {optional ? <Text className="font-sans text-ink-muted"> (optional)</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inkMuted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-input border bg-surface-card px-4 font-sans text-body text-ink ${multiline ? "min-h-amount py-3" : "h-input"} ${error ? "border-danger" : "border-border-input"}`}
        {...props}
      />
      {error ? <Text className="font-sans text-caption text-danger">{error}</Text> : null}
    </View>
  );
}
