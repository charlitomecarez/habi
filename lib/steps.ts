import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  hasSleepWeightAccess,
  hasStepsAccess,
  isHealthConnectSupported,
  readWeekSteps,
  requestSleepWeightAccess,
  requestStepsAccess,
} from "@/lib/health-connect";

const KEY = ["steps"] as const;

/** Whether you allowed steps, and sleep and weight, and the last 7 days of steps, oldest first. */
export function useSteps() {
  return useQuery({
    queryKey: KEY,
    enabled: isHealthConnectSupported,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const access = await hasStepsAccess();
      if (!access) return { access, sleepWeight: false, week: [] };
      return { access, sleepWeight: await hasSleepWeightAccess(), week: await readWeekSteps(new Date()) };
    },
  });
}

export function useAllowSteps() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: requestStepsAccess,
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** For a phone that allowed only steps in v1.4.0. */
export function useAllowSleepWeight() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: requestSleepWeightAccess,
    onSettled: () => {
      void client.invalidateQueries({ queryKey: KEY });
      void client.invalidateQueries({ queryKey: ["sleep"] });
    },
  });
}

/** The average of the days before today. */
export function stepsAverage(week: readonly number[]): number {
  const before = week.slice(0, -1);
  return before.length ? Math.round(before.reduce((sum, n) => sum + n, 0) / before.length) : 0;
}
