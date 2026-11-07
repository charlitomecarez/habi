import { addDays, startOfDay, subDays } from "date-fns";
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";

// Android: steps from Health Connect. The data stays on the phone. Nothing goes to Supabase.

export const isHealthConnectSupported = true;

const STEPS = { accessType: "read", recordType: "Steps" } as const;

async function ready(): Promise<boolean> {
  const status = await getSdkStatus();
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  return initialize();
}

export async function hasStepsAccess(): Promise<boolean> {
  if (!(await ready())) return false;
  const granted = await getGrantedPermissions();
  return granted.some((p) => p.recordType === "Steps" && p.accessType === "read");
}

export async function requestStepsAccess(): Promise<boolean> {
  if (!(await ready())) return false;
  const granted = await requestPermission([STEPS]);
  return granted.some((p) => p.recordType === "Steps");
}

async function stepsOn(day: Date): Promise<number> {
  const { records } = await readRecords("Steps", {
    timeRangeFilter: {
      operator: "between",
      startTime: startOfDay(day).toISOString(),
      endTime: addDays(startOfDay(day), 1).toISOString(),
    },
  });
  return records.reduce((sum, r) => sum + r.count, 0);
}

/** The last 7 days of steps, oldest first. The last one is today. */
export async function readWeekSteps(now: Date): Promise<number[]> {
  return Promise.all(Array.from({ length: 7 }, (_, i) => stepsOn(subDays(now, 6 - i))));
}

export function openHealthConnect() {
  openHealthConnectSettings();
}
