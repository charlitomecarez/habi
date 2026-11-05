// Web: a browser cannot ring on a locked phone, so alarms work only in the Android app.

export type AlarmSetup = { notifications: boolean; fullScreen: boolean; battery: boolean };

export type Alarm = {
  id: string;
  hour: number;
  minute: number;
  days: number[];
  label: string;
  enabled: boolean;
  atMs: number | null;
};

export const isAlarmSupported = false;

export function getAlarms(): Alarm[] {
  return [];
}

export function saveAlarms(_alarms: Alarm[]) {}

export function ringTestAlarm(_now?: number) {}

export function ringingAlarmId(): string | null {
  return null;
}

export function stopRinging() {}

export function alarmSetup(): AlarmSetup | null {
  return null;
}

export function openFullScreenSettings() {}

export function openAppSettings() {}
