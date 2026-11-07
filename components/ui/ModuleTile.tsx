import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type TileTone = "accent" | "daily" | "people" | "home" | "records";

export type TileIcon =
  | { set?: "ionicons"; name: ComponentProps<typeof Ionicons>["name"] }
  | { set: "material"; name: ComponentProps<typeof MaterialCommunityIcons>["name"] };

export function TileGlyph({ icon, color, size }: { icon: TileIcon; color: string; size: number }) {
  if (icon.set === "material") return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
  return <Ionicons name={icon.name} size={size} color={color} />;
}
