import { AlarmModule, type AlarmSetup } from "@/modules/alarm";

// Android: alarms run on the phone through the local alarm module, so they ring with no
// internet and no session. They do not go to Supabase.

export type { AlarmSetup };

export type Alarm = {
  id: string;
  hour: number;
  minute: number;
  /** 1 (Monday) to 7 (Sunday). Empty rings once. */
  days: number[];
  label: string;
  enabled: boolean;
  /** A fixed moment, for a one-time ring such as the test. */
  atMs: number | null;
};

export const isAlarmSupported = AlarmModule !== null;

const TEST_ID = "test";
const TEST_DELAY_MS = 60 * 1000;

export function getAlarms(): Alarm[] {
  return AlarmModule ? (JSON.parse(AlarmModule.getAlarms()) as Alarm[]) : [];
}

export function saveAlarms(alarms: Alarm[]) {
  AlarmModule?.saveAlarms(JSON.stringify(alarms));
}

/** Rings in one minute, so you can lock the phone and check it. */
export function ringTestAlarm(now = Date.now()) {
  const test: Alarm = {
    id: TEST_ID,
    hour: 0,
    minute: 0,
    days: [],
    label: "Test alarm",
    enabled: true,
    atMs: now + TEST_DELAY_MS,
  };
  saveAlarms([...getAlarms().filter((a) => a.id !== TEST_ID), test]);
}

export function ringingAlarmId(): string | null {
  return AlarmModule?.getRingingId() ?? null;
}

export function stopRinging() {
  AlarmModule?.stopRinging();
}

export function alarmSetup(): AlarmSetup | null {
  return AlarmModule?.getSetup() ?? null;
}

export function openFullScreenSettings() {
  AlarmModule?.openFullScreenSettings();
}

export function openAppSettings() {
  AlarmModule?.openAppSettings();
}
