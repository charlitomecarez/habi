import { Tabs } from "expo-router";

import { TabBar } from "@/components/ui/TabBar";

export default function AppTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="money" options={{ title: "Money" }} />
      <Tabs.Screen name="todos" options={{ title: "Todos" }} />
      <Tabs.Screen name="vehicle" options={{ title: "Vehicle" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
