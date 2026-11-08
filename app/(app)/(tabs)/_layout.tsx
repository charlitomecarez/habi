import { Tabs } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";

import { TabBar } from "@/components/ui/TabBar";

export default function AppTabsLayout() {
  // The tab navigator's built-in slide when you tap a tab. None with reduce motion on.
  const reduced = useReducedMotion();
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: reduced ? "none" : "shift" }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="money" options={{ title: "Money" }} />
      <Tabs.Screen name="todos" options={{ title: "Todos" }} />
      <Tabs.Screen name="vehicle" options={{ title: "Vehicle" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
