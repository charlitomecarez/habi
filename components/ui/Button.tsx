import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useColors } from "@/lib/colors";

type Variant = "primary" | "secondary" | "destructive";

const containerByVariant: Record<Variant, string> = {
  primary: "bg-accent active:bg-accent-strong",
  secondary: "border border-border-input bg-surface-card active:bg-surface-muted",
  destructive: "border border-border-input bg-surface-card active:bg-danger-tint",
};

const labelByVariant: Record<Variant, string> = {
  primary: "text-on-accent",
  secondary: "text-ink",
  destructive: "text-danger",
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: "button" | "input";
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "button",
  icon,
  loading = false,
  disabled = false,
}: ButtonProps) {
  const colors = useColors();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      className={`${size === "button" ? "h-button rounded-card" : "h-input rounded-input"} flex-row items-center justify-center gap-3 px-5 ${containerByVariant[variant]} ${inactive ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.onAccent : colors.ink} />
      ) : (
        <View className="flex-row items-center gap-3">
          {icon}
          <Text className={`font-semibold text-body ${labelByVariant[variant]}`}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
