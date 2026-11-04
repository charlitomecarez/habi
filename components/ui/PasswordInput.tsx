import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { useColors } from "@/lib/colors";

type PasswordInputProps = Omit<TextInputProps, "className" | "style" | "secureTextEntry"> & {
  label: string;
  optional?: boolean;
  /** Draws the 2px accent border of the field the screen is about. */
  emphasis?: boolean;
  error?: string;
};

/** A password field with a show and hide button inside it. */
export function PasswordInput({ label, optional = false, emphasis = false, error, ...props }: PasswordInputProps) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const border = error ? "border-danger" : emphasis ? "border-accent" : "border-border-input";

  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">
        {label}
        {optional ? <Text className="font-sans text-ink-muted"> (optional)</Text> : null}
      </Text>
      <View
        className={`h-input flex-row items-center rounded-input bg-surface-card pl-4 pr-1 ${emphasis ? "border-2" : "border"} ${border}`}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.inkMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          className="h-full min-w-0 flex-1 font-sans text-body text-ink"
          {...props}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          onPress={() => setVisible((v) => !v)}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.inkMuted} />
        </Pressable>
      </View>
      {error ? <Text className="font-sans text-caption text-danger">{error}</Text> : null}
    </View>
  );
}
