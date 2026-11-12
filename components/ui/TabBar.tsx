import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { PressScale } from "@/components/ui/Motion";
import { useColors } from "@/lib/colors";
import { glideTiming } from "@/lib/motion";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

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
  const color = focused ? colors.shell : colors.onShell;
  const icon = ICONS[route];
  if (icon === "motorbike") return <MaterialCommunityIcons name="motorbike" size={24} color={color} />;
  return <Ionicons name={focused ? icon.open : icon.closed} size={22} color={color} />;
}

/** One cream pill that glides to the open tab. With reduce motion on, it moves at once. */
function GlidePill({ index, tabWidth }: { index: number; tabWidth: number }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(index * tabWidth);
  useEffect(() => {
    x.set(reduced ? index * tabWidth : withTiming(index * tabWidth, glideTiming));
  }, [index, tabWidth, x, reduced]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  if (tabWidth === 0) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, width: tabWidth }, animated]}>
      <View className="h-8 w-slot self-center rounded-pill bg-on-shell" />
    </Animated.View>
  );
}

/** The app's tab bar: indigo, and the open tab has a filled icon on a cream pill. */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const [tabWidth, setTabWidth] = useState(0);
  return (
    <View
      className="flex-row bg-shell pt-2"
      style={{ paddingBottom: insets.bottom + 8 }}
      onLayout={(event) => setTabWidth(event.nativeEvent.layout.width / state.routes.length)}
    >
      <View pointerEvents="none" className="absolute left-0 right-0 top-2">
        <GlidePill index={state.index} tabWidth={tabWidth} />
      </View>
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
              <TabIcon route={route.name} focused={focused} />
            </View>
            <Text
              maxFontSizeMultiplier={1.3}
              className={`text-tab-label text-on-shell ${focused ? "font-semibold" : "font-medium"}`}
            >
              {title}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}
