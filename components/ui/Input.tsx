import { Text, TextInput, View, type TextInputProps } from "react-native";

type InputProps = Omit<TextInputProps, "className" | "style"> & {
  label: string;
};

export function Input({ label, ...props }: InputProps) {
  return (
    <View className="gap-2">
      <Text className="font-medium text-label text-ink">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#5B6168"
        className="h-input rounded-input border border-border-input bg-surface-card px-4 font-sans text-body text-ink"
        {...props}
      />
    </View>
  );
}
