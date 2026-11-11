import { router } from "expo-router";
import { Stack } from "expo-router/js-stack";
import { useEffect, useMemo } from "react";
import { View } from "react-native";

import { SnackbarHost } from "@/components/ui/Snackbar";
import { useWeightsFromHealthConnect } from "@/lib/health-weights";
import { useReduceMotion } from "@/lib/motion";
import { onPushOpened, registerForPushNotifications } from "@/lib/push-notifications";
import { reminderRoute } from "@/lib/reminder-route";
import { useSleepFromPhone } from "@/lib/sleep";
import { noteVaultActivity } from "@/lib/vault";
import { pushOptions, riseOptions } from "@/lib/transitions";
import { refreshWidgets } from "@/lib/widgets";

const onSleepSaved = () => void refreshWidgets();

export default function AppLayout() {
  // Last night's sleep from Health Connect or the screen, and new Health Connect weights. Android only.
  useSleepFromPhone(onSleepSaved);
  useWeightsFromHealthConnect();

  useEffect(() => {
    registerForPushNotifications().catch((error: unknown) => {
      console.warn("Push registration failed", error instanceof Error ? error.message : error);
    });
  }, []);

  useEffect(() => onPushOpened((source, id) => router.push(reminderRoute(source, id))), []);

  // Screens slide in from the right and drag back. Full-screen forms rise from the bottom.
  const reduced = useReduceMotion();
  const push = useMemo(() => pushOptions(reduced), [reduced]);
  const rise = useMemo(() => riseOptions(reduced), [reduced]);

  return (
    // Sees every touch without taking it, for the vault's idle lock.
    <View
      className="flex-1"
      onStartShouldSetResponderCapture={() => {
        noteVaultActivity();
        return false;
      }}
    >
      <Stack screenOptions={push}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alarms/index" />
        <Stack.Screen name="alarms/label" />
        <Stack.Screen name="travel/index" />
        <Stack.Screen name="travel/[id]" />
        <Stack.Screen name="travel/new" options={rise} />
        <Stack.Screen name="travel/edit/[id]" options={rise} />
        <Stack.Screen name="travel/item/new" options={rise} />
        <Stack.Screen name="travel/item/[id]" options={rise} />
        <Stack.Screen name="sports/index" />
        <Stack.Screen name="work/index" />
        <Stack.Screen name="work/profile" />
        <Stack.Screen name="work/[id]" />
        <Stack.Screen name="steps/index" />
        <Stack.Screen name="steps/how" />
        <Stack.Screen name="screen-time/index" />
        <Stack.Screen name="weather/index" />
        <Stack.Screen name="weather/place" />
        <Stack.Screen name="weather/world" />
        <Stack.Screen name="news/index" />
        <Stack.Screen name="news/[id]" />
        <Stack.Screen name="vault/recovery-key" />
        <Stack.Screen name="vault/change-password" />
        <Stack.Screen name="vault/recover" />
        <Stack.Screen name="reports/index" />
        <Stack.Screen name="reports/[id]" />
        <Stack.Screen name="ulam/index" />
        <Stack.Screen name="ulam/cook" />
        <Stack.Screen name="ulam/week" />
        <Stack.Screen name="todo/new" options={rise} />
        <Stack.Screen name="todo/[id]" options={rise} />
        <Stack.Screen name="vehicle/log-service" />
        <Stack.Screen name="vehicle/mark-done" />
        <Stack.Screen name="vehicle/checks" />
        <Stack.Screen name="vehicle/fuel/index" />
        <Stack.Screen name="vehicle/fuel/new" options={rise} />
        <Stack.Screen name="inventory/index" />
        <Stack.Screen name="inventory/locations" />
        <Stack.Screen name="inventory/item/new" options={rise} />
        <Stack.Screen name="inventory/item/[id]" options={rise} />
        <Stack.Screen name="inventory/scan" options={rise} />
        <Stack.Screen name="money/accounts" />
        <Stack.Screen name="money/transactions" />
        <Stack.Screen name="money/subscriptions" />
        <Stack.Screen name="money/bills" />
        <Stack.Screen name="money/import" />
        <Stack.Screen name="money/budgets" />
        <Stack.Screen name="money/goal/[id]" />
        <Stack.Screen name="money/goal/new" options={rise} />
        <Stack.Screen name="money/goal/edit/[id]" options={rise} />
        <Stack.Screen name="money/bill/new" options={rise} />
        <Stack.Screen name="money/transaction/new" options={rise} />
        <Stack.Screen name="money/transaction/[id]" options={rise} />
        <Stack.Screen name="money/recurring/index" />
        <Stack.Screen name="money/recurring/[id]" />
        <Stack.Screen name="money/recurring/new" options={rise} />
        <Stack.Screen name="money/recurring/edit" options={rise} />
        <Stack.Screen name="money/subscription/new" options={rise} />
        <Stack.Screen name="money/subscription/[id]" options={rise} />
        <Stack.Screen name="vault/index" />
        <Stack.Screen name="vault/entry/new" options={rise} />
        <Stack.Screen name="vault/entry/[id]" options={rise} />
        <Stack.Screen name="habits/index" />
        <Stack.Screen name="habits/[id]" />
        <Stack.Screen name="habits/new" options={rise} />
        <Stack.Screen name="habits/edit/[id]" options={rise} />
        <Stack.Screen name="gym/index" />
        <Stack.Screen name="gym/session/[planId]" />
        <Stack.Screen name="gym/exercise/[id]" />
        <Stack.Screen name="gym/plan/new" options={rise} />
        <Stack.Screen name="gym/plan/[id]" options={rise} />
        <Stack.Screen name="shopping/index" />
        <Stack.Screen name="journal/index" />
        <Stack.Screen name="journal/entry/[date]" />
        <Stack.Screen name="journal/[date]" options={rise} />
        <Stack.Screen name="health/index" />
        <Stack.Screen name="health/visit/[id]" />
        <Stack.Screen name="health/visit/new" options={rise} />
        <Stack.Screen name="health/visit/edit/[id]" options={rise} />
        <Stack.Screen name="health/medicine/new" options={rise} />
        <Stack.Screen name="health/medicine/[id]" options={rise} />
        <Stack.Screen name="people/index" />
        <Stack.Screen name="people/[id]" />
        <Stack.Screen name="inbox/index" />
        <Stack.Screen name="inbox/access" />
        <Stack.Screen name="inbox/record" options={rise} />
        <Stack.Screen name="debts/index" />
        <Stack.Screen name="debts/[id]" />
        <Stack.Screen name="debts/new" options={rise} />
        <Stack.Screen name="debts/edit/[id]" options={rise} />
        <Stack.Screen name="documents/index" />
        <Stack.Screen name="documents/[id]" />
        <Stack.Screen name="documents/new" options={rise} />
        <Stack.Screen name="documents/edit/[id]" options={rise} />
        <Stack.Screen name="content/index" />
        <Stack.Screen name="content/video/[id]" />
        <Stack.Screen name="content/video/new" options={rise} />
        <Stack.Screen name="content/video/edit/[id]" options={rise} />
      </Stack>
      <SnackbarHost />
    </View>
  );
}
