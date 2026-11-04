import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Text } from "react-native";

import { useColors } from "@/lib/colors";

/** The tab name: semibold in accent on the open tab, medium in muted ink on the others. */
function TabLabel({ focused, children }: { focused: boolean; children: string }) {
  return (
    <Text className={`text-tab-label ${focused ? "font-semibold text-accent" : "font-medium text-ink-muted"}`}>
      {children}
    </Text>
  );
}

function tabIcon(name: ComponentProps<typeof Ionicons>["name"]) {
  return function TabIcon({ focused }: { focused: boolean }) {
    const colors = useColors();
    return <Ionicons name={name} size={22} color={focused ? colors.accent : colors.inkMuted} />;
  };
}

export default function AppTabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          height: 80,
          paddingTop: 8,
          paddingBottom: 16,
          backgroundColor: colors.surfaceCard,
          borderTopColor: colors.border,
        },
        tabBarLabel: TabLabel,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home-outline") }} />
      <Tabs.Screen name="money" options={{ title: "Money", tabBarIcon: tabIcon("card-outline") }} />
      <Tabs.Screen name="todos" options={{ title: "Todos", tabBarIcon: tabIcon("checkbox-outline") }} />
      <Tabs.Screen name="vehicle" options={{ title: "Vehicle", tabBarIcon: tabIcon("bicycle-outline") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("ellipsis-horizontal") }} />
    </Tabs>
  );
}
