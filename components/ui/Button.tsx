import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useColors } from "@/lib/colors";

/** `cream` and `ghost` are only for the indigo shell: login and the top of Home. Cream is the primary there. */
type Variant = "primary" | "secondary" | "destructive" | "plain" | "cream" | "ghost";

const containerByVariant: Record<Variant, string> = {
  primary: "bg-accent active:bg-accent-strong",
  secondary: "border border-border-input bg-surface-card active:bg-surface-muted",
  destructive: "border border-border-input bg-surface-card active:bg-danger-tint",
  plain: "active:bg-surface-muted",
  cream: "bg-on-shell active:opacity-90",
  ghost: "border-2 border-on-shell/45 active:bg-on-shell/10",
};

const labelByVariant: Record<Variant, string> = {
  primary: "text-on-accent",
  secondary: "text-ink",
  destructive: "text-danger",
  plain: "text-accent",
  cream: "text-shell",
  ghost: "text-on-shell",
};

const SPINNER: Record<Variant, (c: ReturnType<typeof useColors>) => string> = {
  primary: (c) => c.onAccent,
  secondary: (c) => c.ink,
  destructive: (c) => c.ink,
  plain: (c) => c.ink,
  cream: (c) => c.shell,
  ghost: (c) => c.onShell,
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
        <ActivityIndicator color={SPINNER[variant](colors)} />
      ) : (
        <View className="flex-row items-center gap-3">
          {icon}
          <Text className={`font-semibold text-body ${labelByVariant[variant]}`}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
