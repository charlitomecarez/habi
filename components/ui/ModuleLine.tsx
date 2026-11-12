import { Pressable, Text, View } from "react-native";

import { TileGlyph, type TileIcon, type TileTone } from "@/components/ui/ModuleTile";
import { useColors } from "@/lib/colors";

const ICON_SIZE = 20;

const TINT: Record<TileTone, string> = {
  accent: "bg-accent-tint",
  daily: "bg-daily-tint",
  people: "bg-people-tint",
  home: "bg-home-tint",
  records: "bg-records-tint",
};

type ModuleLineProps = {
  label: string;
  icon: TileIcon;
  tone: TileTone;
  /** How much is inside, such as "12". */
  detail?: string;
  onPress: () => void;
  /** A full-width row with the icon on its section tint and the count under the name, as on More. */
  list?: boolean;
};

/** A module on More or in the Home shortcuts: an icon in its section colour, a name and how much is inside. */
export function ModuleLine({ label, icon, tone, detail, onPress, list }: ModuleLineProps) {
  const colors = useColors();
  const a11y = [label, detail].filter(Boolean).join(", ");

  if (list) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        onPress={onPress}
        className="min-h-touch w-full flex-row items-center gap-3 border-b-2 border-border py-2 active:bg-surface-muted"
      >
        <View className={`h-chip w-chip items-center justify-center rounded-md ${TINT[tone]}`}>
          <TileGlyph icon={icon} size={ICON_SIZE} color={colors[tone]} />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
            {label}
          </Text>
          {detail ? <Text className="font-sans text-caption text-ink-muted">{detail}</Text> : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      className="min-h-touch w-1/2 flex-row items-center justify-between gap-2 border-b-2 border-border py-2 pr-3 active:bg-surface-muted"
    >
      <View className="min-w-0 shrink flex-row items-center gap-2">
        <TileGlyph icon={icon} size={ICON_SIZE} color={colors[tone]} />
        <Text className="min-w-0 shrink font-medium text-label text-ink">{label}</Text>
      </View>
      {detail ? <Text className="font-sans text-caption text-ink-muted">{detail}</Text> : null}
    </Pressable>
  );
}
