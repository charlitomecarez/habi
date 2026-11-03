import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { colors } from "@/lib/colors";

/** The screen's one primary action. The only component with a shadow. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="absolute bottom-5 right-5 h-button w-button items-center justify-center rounded-fab bg-accent shadow-lg shadow-ink/20 active:bg-accent-strong"
    >
      <Ionicons name="add" size={28} color={colors.onAccent} />
    </Pressable>
  );
}
