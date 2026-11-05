import { AWAKE_DELAY_MS, AWAKE_ID, TEST_ID, type Alarm } from "@/lib/alarm-rules";
import { AlarmModule, type AlarmSetup } from "@/modules/alarm";

// Android: alarms run on the phone through the local alarm module, so they ring with no
// internet and no session. They do not go to Supabase.

export type { Alarm, AlarmSetup };

export const isAlarmSupported = AlarmModule !== null;

const TEST_DELAY_MS = 60 * 1000;

export function getAlarms(): Alarm[] {
  return AlarmModule ? (JSON.parse(AlarmModule.getAlarms()) as Alarm[]) : [];
}

function saveAlarms(alarms: Alarm[]) {
  AlarmModule?.saveAlarms(JSON.stringify(alarms));
}

/** Adds an alarm, or replaces the one with the same id. */
export function putAlarm(alarm: Alarm) {
  saveAlarms([...getAlarms().filter((a) => a.id !== alarm.id), alarm]);
}

export function removeAlarm(id: string) {
  saveAlarms(getAlarms().filter((a) => a.id !== id));
}

const oneTime = (id: string, label: string, atMs: number): Alarm => ({
  id,
  hour: 0,
  minute: 0,
  days: [],
  label,
  enabled: true,
  atMs,
});

/** Rings in one minute, so you can lock the phone and check it. */
export function ringTestAlarm(now = Date.now()) {
  putAlarm(oneTime(TEST_ID, "Test alarm", now + TEST_DELAY_MS));
}

/** Shows "Are you awake?" 3 minutes from now, in case you go back to bed. */
export function scheduleAwakeCheck(now = Date.now()) {
  putAlarm(oneTime(AWAKE_ID, "Are you awake?", now + AWAKE_DELAY_MS));
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
