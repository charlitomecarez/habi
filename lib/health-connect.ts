import { addDays, set, startOfDay, subDays } from "date-fns";
import {
  getChanges,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";

import type { HealthWeight } from "@/lib/health-weights";
import { longestNightSession } from "@/lib/sleep-detect";
import type { Span } from "@/lib/sleep-detect";

// Android: steps, sleep and weight from Health Connect. Steps and sleep stay on the phone. A weight
// saves to the account, as a typed weight does.

export const isHealthConnectSupported = true;

const STEPS = { accessType: "read", recordType: "Steps" } as const;
const SLEEP = { accessType: "read", recordType: "SleepSession" } as const;
const WEIGHT = { accessType: "read", recordType: "Weight" } as const;

async function ready(): Promise<boolean> {
  const status = await getSdkStatus();
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  return initialize();
}

async function granted(recordType: string): Promise<boolean> {
  const list = await getGrantedPermissions();
  return list.some((p) => p.recordType === recordType && p.accessType === "read");
}

export async function hasStepsAccess(): Promise<boolean> {
  if (!(await ready())) return false;
  return granted("Steps");
}

/** True when you allowed both sleep and weight. */
export async function hasSleepWeightAccess(): Promise<boolean> {
  if (!(await ready())) return false;
  return (await granted("SleepSession")) && (await granted("Weight"));
}

/** One Health Connect screen for steps, sleep and weight. True when steps are allowed. */
export async function requestStepsAccess(): Promise<boolean> {
  if (!(await ready())) return false;
  const list = await requestPermission([STEPS, SLEEP, WEIGHT]);
  return list.some((p) => p.recordType === "Steps");
}

/** For a phone that allowed only steps in v1.4.0. */
export async function requestSleepWeightAccess(): Promise<boolean> {
  if (!(await ready())) return false;
  const list = await requestPermission([SLEEP, WEIGHT]);
  return list.some((p) => p.recordType === "SleepSession");
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

/** The night that ends on `day`, from Health Connect, or null when it has none. */
export async function readNightSleep(day: Date): Promise<Span | null> {
  if (!(await granted("SleepSession"))) return null;
  const { records } = await readRecords("SleepSession", {
    timeRangeFilter: {
      operator: "between",
      startTime: set(subDays(day, 1), { hours: 12, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
      endTime: set(day, { hours: 12, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
    },
  });
  const sessions = records.map((r) => ({ start: Date.parse(r.startTime), end: Date.parse(r.endTime) }));
  return longestNightSession(sessions, day);
}

/** Every weight from `since` to now. */
export async function readWeightsSince(since: Date): Promise<HealthWeight[]> {
  const { records } = await readRecords("Weight", {
    timeRangeFilter: { operator: "after", startTime: since.toISOString() },
  });
  return records.map((r) => ({ at: Date.parse(r.time), kg: r.weight.inKilograms }));
}

/** A token that marks now. Later changes come from `readWeightChanges`. */
export async function newWeightToken(): Promise<string> {
  const { nextChangesToken } = await getChanges({ recordTypes: ["Weight"] });
  return nextChangesToken;
}

/** The weights added or changed after the token. Null when the token has expired. */
export async function readWeightChanges(token: string): Promise<{ weights: HealthWeight[]; token: string } | null> {
  const weights: HealthWeight[] = [];
  let next = token;
  for (;;) {
    const page = await getChanges({ changesToken: next });
    if (page.changesTokenExpired) return null;
    for (const { record } of page.upsertionChanges) {
      if (record.recordType === "Weight") weights.push({ at: Date.parse(record.time), kg: record.weight.inKilograms });
    }
    next = page.nextChangesToken;
    if (!page.hasMore) return { weights, token: next };
  }
}

export async function hasWeightAccess(): Promise<boolean> {
  if (!(await ready())) return false;
  return granted("Weight");
}

export function openHealthConnect() {
  openHealthConnectSettings();
}
