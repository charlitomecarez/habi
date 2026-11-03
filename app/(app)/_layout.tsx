import { Stack } from "expo-router";
import { useEffect } from "react";

import { registerForPushNotifications } from "@/lib/push-notifications";

export default function AppLayout() {
  useEffect(() => {
    registerForPushNotifications().catch((error: unknown) => {
      console.warn("Push registration failed", error instanceof Error ? error.message : error);
    });
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="todo/new" options={{ presentation: "modal" }} />
      <Stack.Screen name="todo/[id]" options={{ presentation: "modal" }} />
    </Stack>
  );
}
