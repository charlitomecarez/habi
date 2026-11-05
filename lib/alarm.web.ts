import type { Alarm } from "@/lib/alarm-rules";

// Web: a browser cannot ring on a locked phone, so alarms work only in the Android app.

export type { Alarm };
export type AlarmSetup = { notifications: boolean; fullScreen: boolean; battery: boolean };

export const isAlarmSupported = false;

export function getAlarms(): Alarm[] {
  return [];
}

export function putAlarm(_alarm: Alarm) {}

export function removeAlarm(_id: string) {}

export function ringTestAlarm(_now?: number) {}

export function scheduleAwakeCheck(_now?: number) {}

export function ringingAlarmId(): string | null {
  return null;
}

export function stopRinging() {}

export function alarmSetup(): AlarmSetup | null {
  return null;
}

export function openFullScreenSettings() {}

export function openAppSettings() {}
