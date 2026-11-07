import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Android: asks for permission, gets the Expo push token and saves it to
 * push_tokens. The send-reminders Edge Function sends to the "reminders" channel.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;

  await Notifications.setNotificationChannelAsync("reminders", {
    name: "Reminders",
    // eslint-disable-next-line import/namespace -- the enum reaches this namespace through a re-export ESLint cannot follow.
    importance: Notifications.AndroidImportance.HIGH,
  });

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== "granted") return;

  const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error("No EAS project ID. Run `npx eas init` to add it to app.json.");
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.from("push_tokens").upsert(
    {
      token,
      platform: "android",
      device_name: Device.deviceName,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) throw error;
}

/** Calls `open` with the source and its ID when a tap on a push opens the app. Returns the unsubscribe. */
export function onPushOpened(open: (source: unknown, sourceId: unknown) => void): () => void {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    if (!data) return;
    Notifications.clearLastNotificationResponse();
    open(data.source, data.sourceId);
  };
  // A tap that started the app came before this listener.
  handle(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
