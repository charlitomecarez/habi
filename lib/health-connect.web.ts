/** The web has no Health Connect. */
export const isHealthConnectSupported = false;

export async function hasStepsAccess(): Promise<boolean> {
  return false;
}

export async function requestStepsAccess(): Promise<boolean> {
  return false;
}

export async function readWeekSteps(_now: Date): Promise<number[]> {
  return [];
}

export function openHealthConnect() {}
