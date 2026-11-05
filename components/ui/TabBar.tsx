import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, type ComponentProps } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { PressScale } from "@/components/ui/Motion";
import { useColors } from "@/lib/colors";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const PILL_MS = 160;

/** The motorbike has no filled form, so it uses the same glyph in both states. */
const ICONS: Record<
  string,
  { open: ComponentProps<typeof Ionicons>["name"]; closed: ComponentProps<typeof Ionicons>["name"] } | "motorbike"
> = {
  index: { open: "home", closed: "home-outline" },
  money: { open: "card", closed: "card-outline" },
  todos: { open: "checkbox", closed: "checkbox-outline" },
  vehicle: "motorbike",
  more: { open: "ellipsis-horizontal", closed: "ellipsis-horizontal" },
};

function TabIcon({ route, focused }: { route: string; focused: boolean }) {
  const colors = useColors();
  const color = focused ? colors.accent : colors.inkMuted;
  const icon = ICONS[route];
  if (icon === "motorbike") return <MaterialCommunityIcons name="motorbike" size={24} color={color} />;
  return <Ionicons name={focused ? icon.open : icon.closed} size={22} color={color} />;
}

function Pill({ focused }: { focused: boolean }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    opacity.set(reduced ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: PILL_MS }));
  }, [focused, opacity, reduced]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View style={[{ position: "absolute" }, animated]}>
      <View className="h-8 w-slot rounded-pill bg-accent-tint" />
    </Animated.View>
  );
}

/** The app's tab bar: the open tab has a filled icon on a tinted pill. */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  return (
    <View className="flex-row border-t border-border bg-surface-card pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const title = descriptors[route.key].options.title ?? route.name;
        const onPress = () => {
          const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        return (
          <PressScale
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={title}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
            wrapperStyle={{ flex: 1 }}
            className="min-h-touch items-center gap-1"
          >
            <View className="h-8 items-center justify-center">
              <Pill focused={focused} />
              <TabIcon route={route.name} focused={focused} />
            </View>
            <Text className={`text-tab-label ${focused ? "font-semibold text-accent" : "font-medium text-ink-muted"}`}>
              {title}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}
