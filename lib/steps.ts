import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hasStepsAccess, isHealthConnectSupported, readWeekSteps, requestStepsAccess } from "@/lib/health-connect";

const KEY = ["steps"] as const;

/** Whether you allowed steps, and the last 7 days, oldest first. */
export function useSteps() {
  return useQuery({
    queryKey: KEY,
    enabled: isHealthConnectSupported,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const access = await hasStepsAccess();
      return { access, week: access ? await readWeekSteps(new Date()) : [] };
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

/** The average of the days before today. */
export function stepsAverage(week: readonly number[]): number {
  const before = week.slice(0, -1);
  return before.length ? Math.round(before.reduce((sum, n) => sum + n, 0) / before.length) : 0;
}
