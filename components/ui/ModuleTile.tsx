import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import { PressScale } from "@/components/ui/Motion";
import { useColors } from "@/lib/colors";

export type TileTone = "accent" | "daily" | "people" | "home" | "records";

export type TileIcon =
  | { set?: "ionicons"; name: ComponentProps<typeof Ionicons>["name"] }
  | { set: "material"; name: ComponentProps<typeof MaterialCommunityIcons>["name"] };

const TINT: Record<TileTone, string> = {
  accent: "bg-accent-tint",
  daily: "bg-daily-tint",
  people: "bg-people-tint",
  home: "bg-home-tint",
  records: "bg-records-tint",
};

export function TileGlyph({ icon, color, size }: { icon: TileIcon; color: string; size: number }) {
  if (icon.set === "material") return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
  return <Ionicons name={icon.name} size={size} color={color} />;
}

type ModuleTileProps = { label: string; icon: TileIcon; tone: TileTone; onPress: () => void };

/** A module in the More grid or the Home shortcuts: a soft section colour and a short name. */
export function ModuleTile({ label, icon, tone, onPress }: ModuleTileProps) {
  const colors = useColors();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      wrapperStyle={{ width: "25%" }}
      className="min-h-touch items-center gap-1 py-1"
    >
      <View className={`h-button w-button items-center justify-center rounded-input ${TINT[tone]}`}>
        <TileGlyph icon={icon} size={24} color={colors[tone]} />
      </View>
      <Text className="text-center font-medium text-badge text-ink" numberOfLines={1}>
        {label}
      </Text>
    </PressScale>
  );
}
