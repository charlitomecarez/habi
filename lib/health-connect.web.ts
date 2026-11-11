import type { HealthWeight } from "@/lib/health-weights";
import type { Span } from "@/lib/sleep-detect";

/** The web has no Health Connect. */
export const isHealthConnectSupported = false;

export async function hasStepsAccess(): Promise<boolean> {
  return false;
}

export async function hasSleepWeightAccess(): Promise<boolean> {
  return false;
}

export async function requestStepsAccess(): Promise<boolean> {
  return false;
}

export async function requestSleepWeightAccess(): Promise<boolean> {
  return false;
}

export async function readWeekSteps(_now: Date): Promise<number[]> {
  return [];
}

export async function readNightSleep(_day: Date): Promise<Span | null> {
  return null;
}

export async function readWeightsSince(_since: Date): Promise<HealthWeight[]> {
  return [];
}

export async function newWeightToken(): Promise<string> {
  return "";
}

export async function readWeightChanges(_token: string): Promise<{ weights: HealthWeight[]; token: string } | null> {
  return null;
}

export async function hasWeightAccess(): Promise<boolean> {
  return false;
}

export function openHealthConnect() {}
