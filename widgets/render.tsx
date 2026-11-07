import AsyncStorage from "@react-native-async-storage/async-storage";
import { startOfDay, subDays } from "date-fns";

import { ScreenTimeModule } from "@/modules/screen-time";
import type { SleepLog } from "@/lib/sleep";

import { screenTimeLine, SIGNED_OUT, sleepLine, type WidgetLine } from "./content";
import { LineWidget } from "./LineWidget";

export const SLEEP_WIDGET = "Sleep";
export const SCREEN_TIME_WIDGET = "ScreenTime";

/** The sign-in session in AsyncStorage. A signed-out phone shows nothing personal. */
async function signedIn(): Promise<boolean> {
  const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
  return keys.some((key) => key.endsWith("-auth-token"));
}

async function sleepToday(): Promise<WidgetLine> {
  const text = await AsyncStorage.getItem("sleep-log").catch(() => null);
  return sleepLine(text ? (JSON.parse(text) as SleepLog) : {}, new Date());
}

async function screenTimeToday(): Promise<WidgetLine> {
  if (!ScreenTimeModule?.hasAccess()) return screenTimeLine(null, 0);
  const today = startOfDay(new Date());
  const total = async (start: Date, end: Date) => {
    const apps = await ScreenTimeModule!.getUsage(start.getTime(), end.getTime());
    return apps.reduce((sum, app) => sum + app.totalMs, 0);
  };
  const todayMs = await total(today, new Date());
  const weekMs = await total(subDays(today, 7), today);
  return screenTimeLine(todayMs, weekMs / 7);
}

/** The widget for its name. Each one reads only data on the phone, so it works with no signal. */
export async function widgetFor(name: string) {
  const sleep = name === SLEEP_WIDGET;
  const line = !(await signedIn()) ? SIGNED_OUT : sleep ? await sleepToday() : await screenTimeToday();
  return <LineWidget title={sleep ? "Sleep" : "Screen time"} line={line} uri={sleep ? "myapp://steps" : "myapp://"} />;
}
