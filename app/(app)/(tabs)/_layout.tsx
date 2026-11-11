import { Tabs } from "expo-router";

import { TabBar } from "@/components/ui/TabBar";
import { motion, useReduceMotion } from "@/lib/motion";

export default function AppTabsLayout() {
  // The new tab fades in, with no sideways move, so tabs never feel like a stack. None with reduce motion on.
  const reduced = useReduceMotion();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: reduced ? "none" : "fade",
        transitionSpec: { animation: "timing", config: { duration: motion.fade } },
      }}
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
