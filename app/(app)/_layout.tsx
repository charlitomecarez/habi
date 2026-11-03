import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

const ACCENT = "#0F766E";
const INK_MUTED = "#5B6168";

function tabIcon(name: ComponentProps<typeof Ionicons>["name"]) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <Ionicons name={name} size={22} color={focused ? ACCENT : INK_MUTED} />;
  };
}

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INK_MUTED,
        tabBarStyle: {
          height: 80,
          paddingTop: 8,
          paddingBottom: 16,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E3E5E0",
        },
        tabBarLabelStyle: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home-outline") }} />
      <Tabs.Screen name="money" options={{ title: "Money", tabBarIcon: tabIcon("wallet-outline") }} />
      <Tabs.Screen name="todos" options={{ title: "Todos", tabBarIcon: tabIcon("checkbox-outline") }} />
      <Tabs.Screen name="vehicle" options={{ title: "Vehicle", tabBarIcon: tabIcon("bicycle-outline") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("ellipsis-horizontal") }} />
    </Tabs>
  );
}
