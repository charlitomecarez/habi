import { Text, TextInput, View, type TextInputProps } from "react-native";

import { useColors } from "@/lib/colors";

type InputProps = Omit<TextInputProps, "className" | "style"> & {
  label: string;
  optional?: boolean;
  error?: string;
  /** "shell" is for a field on the indigo shell, such as the login email. */
  tone?: "page" | "shell";
};

export function Input({ label, optional = false, error, multiline, tone = "page", ...props }: InputProps) {
  const shell = tone === "shell";
  const colors = useColors();
  return (
    <View className="gap-2">
      <Text className={`font-semibold text-label ${shell ? "text-on-shell" : "text-ink"}`}>
        {label}
        {optional ? (
          <Text className={`font-sans ${shell ? "text-on-shell-muted" : "text-ink-muted"}`}> (optional)</Text>
        ) : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={shell ? colors.onShellMuted : colors.inkMuted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-input px-4 font-sans text-body ${shell ? "border-2 bg-on-shell/10 text-on-shell" : "border bg-surface-card text-ink"} ${multiline ? "min-h-amount py-3" : "h-input"} ${error ? (shell ? "border-over-fill" : "border-danger") : shell ? "border-on-shell/45" : "border-border-input"}`}
        {...props}
      />
      {error ? (
        <Text className={`font-sans text-caption ${shell ? "text-on-shell" : "text-danger"}`}>{error}</Text>
      ) : null}
    </View>
  );
}
