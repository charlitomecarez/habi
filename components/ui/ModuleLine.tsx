import { Pressable, Text, View } from "react-native";

import { TileGlyph, type TileIcon, type TileTone } from "@/components/ui/ModuleTile";
import { useColors } from "@/lib/colors";

const ICON_SIZE = 20;

type ModuleLineProps = {
  label: string;
  icon: TileIcon;
  tone: TileTone;
  /** How much is inside, such as "12". */
  detail?: string;
  onPress: () => void;
  /** Fill the parent, when a wrapper sets the width. */
  fill?: boolean;
};

/** A module on More or in the Home shortcuts: an icon in its section colour, a name and how much is inside. */
export function ModuleLine({ label, icon, tone, detail, onPress, fill }: ModuleLineProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, detail].filter(Boolean).join(", ")}
      onPress={onPress}
      className={`min-h-touch ${fill ? "w-full" : "w-1/2"} flex-row items-center justify-between gap-2 border-b-2 border-border py-2 pr-3 active:bg-surface-muted`}
    >
      <View className="min-w-0 shrink flex-row items-center gap-2">
        <TileGlyph icon={icon} size={ICON_SIZE} color={colors[tone]} />
        <Text className="min-w-0 shrink font-medium text-label text-ink">{label}</Text>
      </View>
      {detail ? <Text className="font-sans text-caption text-ink-muted">{detail}</Text> : null}
    </Pressable>
  );
}
