import { Text, View } from "react-native";

import { PressScale } from "@/components/ui/Motion";

export type HeroStat = { value: string; label: string };

type HeroCardProps = {
  title: string;
  /** Up to three numbers under the title. */
  stats: readonly HeroStat[];
  onPress?: () => void;
  accessibilityLabel?: string;
};

function Body({ title, stats }: Pick<HeroCardProps, "title" | "stats">) {
  return (
    <View className="gap-3 rounded-hero bg-accent p-4">
      <Text className="font-bold text-title text-on-accent">{title}</Text>
      <View className="flex-row gap-3">
        {stats.map((stat) => (
          <View key={stat.label} className="flex-1">
            <Text className="font-bold text-heading text-on-accent" numberOfLines={1}>
              {stat.value}
            </Text>
            <Text className="font-sans text-caption text-on-accent">{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The one solid accent card on a screen: a sentence and up to three numbers. */
export function HeroCard({ title, stats, onPress, accessibilityLabel }: HeroCardProps) {
  if (!onPress) return <Body title={title} stats={stats} />;
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={onPress}>
      <Body title={title} stats={stats} />
    </PressScale>
  );
}
