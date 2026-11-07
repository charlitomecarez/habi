import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { useColors } from "@/lib/colors";

/** The screen's one primary action. The only component with a shadow. */
export function Fab({ label, onPress, icon = "add" }: { label: string; onPress: () => void; icon?: "add" | "mic" }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="absolute bottom-5 right-5 h-button flex-row items-center justify-center gap-2 rounded-fab bg-accent px-5 shadow-lg shadow-fab-shadow/20 active:bg-accent-strong"
    >
      <Ionicons name={icon} size={22} color={colors.onAccent} />
      <Text className="font-semibold text-label text-on-accent">{label}</Text>
    </Pressable>
  );
}
