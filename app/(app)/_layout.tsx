import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { registerForPushNotifications } from "@/lib/push-notifications";
import { noteVaultActivity } from "@/lib/vault";

export default function AppLayout() {
  useEffect(() => {
    registerForPushNotifications().catch((error: unknown) => {
      console.warn("Push registration failed", error instanceof Error ? error.message : error);
    });
  }, []);

  return (
    // Sees every touch without taking it, for the vault's idle lock.
    <View
      className="flex-1"
      onStartShouldSetResponderCapture={() => {
        noteVaultActivity();
        return false;
      }}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alarms/index" />
        <Stack.Screen name="alarms/label" />
        <Stack.Screen name="travel/index" />
        <Stack.Screen name="travel/[id]" />
        <Stack.Screen name="travel/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="travel/edit/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="travel/item/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="travel/item/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="ulam/index" />
        <Stack.Screen name="ulam/cook" />
        <Stack.Screen name="ulam/week" />
        <Stack.Screen name="todo/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="todo/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="vehicle/log-service" />
        <Stack.Screen name="vehicle/mark-done" />
        <Stack.Screen name="vehicle/fuel/index" />
        <Stack.Screen name="vehicle/fuel/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="inventory/index" />
        <Stack.Screen name="inventory/locations" />
        <Stack.Screen name="inventory/item/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="inventory/item/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="inventory/scan" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/accounts" />
        <Stack.Screen name="money/transactions" />
        <Stack.Screen name="money/subscriptions" />
        <Stack.Screen name="money/bills" />
        <Stack.Screen name="money/import" />
        <Stack.Screen name="money/budgets" />
        <Stack.Screen name="money/goal/[id]" />
        <Stack.Screen name="money/goal/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/goal/edit/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/bill/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/transaction/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/transaction/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/subscription/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/subscription/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="vault/index" />
        <Stack.Screen name="vault/entry/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="vault/entry/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="habits/index" />
        <Stack.Screen name="habits/[id]" />
        <Stack.Screen name="habits/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="habits/edit/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="gym/index" />
        <Stack.Screen name="gym/session/[planId]" />
        <Stack.Screen name="gym/exercise/[id]" />
        <Stack.Screen name="gym/plan/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="gym/plan/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="shopping/index" />
        <Stack.Screen name="journal/index" />
        <Stack.Screen name="journal/[date]" options={{ presentation: "modal" }} />
        <Stack.Screen name="health/index" />
        <Stack.Screen name="health/visit/[id]" />
        <Stack.Screen name="health/visit/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="health/visit/edit/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="health/medicine/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="health/medicine/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="people/index" />
        <Stack.Screen name="people/[id]" />
        <Stack.Screen name="inbox/index" />
        <Stack.Screen name="inbox/record" options={{ presentation: "modal" }} />
        <Stack.Screen name="debts/index" />
        <Stack.Screen name="debts/[id]" />
        <Stack.Screen name="debts/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="debts/edit/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="documents/index" />
        <Stack.Screen name="documents/[id]" />
        <Stack.Screen name="documents/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="documents/edit/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="content/index" />
        <Stack.Screen name="content/video/[id]" />
        <Stack.Screen name="content/video/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="content/video/edit/[id]" options={{ presentation: "modal" }} />
      </Stack>
    </View>
  );
}
