import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useEffect } from "react";

import { fromHomeSummary, slice } from "@/lib/home-summary";
import { useSaveUserSettings, useUserSettings } from "@/lib/settings";
import { sleepMinutes, useSleepLog, type SleepLog } from "@/lib/sleep";
import { useSteps } from "@/lib/steps";
import { supabase } from "@/lib/supabase";

// The 6 PM health check. Off until you turn it on. While it is on, the app sends one row a day of
// sleep and steps for the last 7 days; at 5:45 PM the health-insight function writes 1 to 3 tips,
// and a push at 6:00 PM says they are ready. Turning it off deletes those rows.

export type HealthDayRow = {
  day: string;
  sleep_minutes: number | null;
  bed_time: string | null;
  wake_time: string | null;
  sleep_source: "health_connect" | "screen" | "typed" | null;
  steps: number | null;
};

export type HealthInsight = { id: string; day: string; tips: string[]; based_on: string; created_at: string };

const INSIGHTS_KEY = ["health-insights"] as const;
const DAYS = 7;
/** The advice is made at 5:45 PM and shows from 6:00 PM. After 6:15 PM, no advice means none came. */
export const ADVICE_MINUTE = 18 * 60;
const LATE_MINUTE = 18 * 60 + 15;

const day = (d: Date) => format(d, "yyyy-MM-dd");

/** The rows for the last 7 days, oldest first. A day with no sleep and no steps sends nothing. */
export function healthDayRows(log: SleepLog, stepsWeek: readonly number[], now: Date): HealthDayRow[] {
  const rows: HealthDayRow[] = [];
  for (let back = DAYS - 1; back >= 0; back--) {
    const date = day(subDays(now, back));
    const entry = log[date];
    // stepsWeek is oldest first and ends today.
    const steps = stepsWeek.length === DAYS ? (stepsWeek[DAYS - 1 - back] ?? null) : null;
    if (!entry && !steps) continue;
    rows.push({
      day: date,
      sleep_minutes: entry ? sleepMinutes(entry) : null,
      bed_time: entry?.bed ?? null,
      wake_time: entry?.wake ?? null,
      // An entry with no source was typed in v1.3.0.
      sleep_source: entry ? (entry.source ?? "typed") : null,
      steps: steps || null,
    });
  }
  return rows;
}

/** True when the phone has sleep or steps for any of the last 3 days. */
export function hasRecentNumbers(rows: readonly HealthDayRow[], now: Date): boolean {
  const since = day(subDays(now, 2));
  return rows.some((r) => r.day >= since && ((r.sleep_minutes ?? 0) > 0 || (r.steps ?? 0) > 0));
}

export type AdviceState =
  | { kind: "off" }
  /** After 6 PM, with today's advice: it goes on top of the screen. */
  | { kind: "today"; insight: HealthInsight }
  /** Before 6 PM: yesterday's advice, at the end of the screen. */
  | { kind: "yesterday"; insight: HealthInsight }
  /** On, with no advice yet. */
  | { kind: "first" }
  /** On, before 6:15 PM today, and no advice from yesterday to show. */
  | { kind: "waiting" }
  /** After 6:15 PM and none came: no recent numbers, or the AI service failed. */
  | { kind: "none"; reason: "no-numbers" | "failed" };

export function adviceState(
  on: boolean,
  insights: readonly HealthInsight[],
  recentNumbers: boolean,
  now: Date,
): AdviceState {
  if (!on) return { kind: "off" };
  const minute = now.getHours() * 60 + now.getMinutes();
  const today = insights.find((i) => i.day === day(now));
  const yesterday = insights.find((i) => i.day === day(subDays(now, 1)));
  if (minute >= ADVICE_MINUTE && today) return { kind: "today", insight: today };
  if (minute >= LATE_MINUTE) return { kind: "none", reason: recentNumbers ? "failed" : "no-numbers" };
  if (yesterday) return { kind: "yesterday", insight: yesterday };
  return insights.length === 0 ? { kind: "first" } : { kind: "waiting" };
}

/** Today's and yesterday's advice, newest first. */
export function useHealthInsights(enabled: boolean) {
  return useQuery({
    queryKey: INSIGHTS_KEY,
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      fromHomeSummary(
        (s) => slice<HealthInsight[]>(s, "health_insights"),
        async (): Promise<HealthInsight[]> => {
          const { data, error } = await supabase
            .from("health_insights")
            .select("id, day, tips, based_on, created_at")
            .order("day", { ascending: false })
            .limit(2);
          if (error) throw error;
          return data;
        },
      ),
  });
}

async function sendDays(rows: HealthDayRow[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("health_days").upsert(rows, { onConflict: "user_id,day" });
  if (error) throw error;
}

/** The rows the phone would send now. */
export function useHealthDayRows(): HealthDayRow[] {
  const sleep = useSleepLog();
  const steps = useSteps();
  return healthDayRows(sleep.data ?? {}, steps.data?.week ?? [], new Date());
}

let sentOn: string | null = null;

/**
 * While the check is on, sends the last 7 days once each app open (and again on a new day).
 * When it is off, it sends nothing.
 */
export function useHealthDaysSync() {
  const on = useUserSettings().data?.healthCheck ?? false;
  const sleep = useSleepLog();
  const steps = useSteps();
  const ready = sleep.isSuccess && !steps.isLoading;
  useEffect(() => {
    if (!on || !ready) return;
    const today = day(new Date());
    if (sentOn === today) return;
    sentOn = today;
    // Best effort: a failed send is tried again on the next open.
    sendDays(healthDayRows(sleep.data ?? {}, steps.data?.week ?? [], new Date())).catch(() => {
      sentOn = null;
    });
  }, [on, ready, sleep.data, steps.data]);
}

export function useTurnOnHealthCheck() {
  const save = useSaveUserSettings();
  const rows = useHealthDayRows();
  return useMutation({
    mutationFn: async () => {
      await save.mutateAsync({ healthCheck: true });
      await sendDays(rows);
      sentOn = day(new Date());
    },
  });
}

/** Deletes this account's health days and advice, and turns the check off. */
export function useTurnOffHealthCheck() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("clear_health_check");
      if (error) throw error;
      sentOn = null;
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["user-settings"] });
      client.removeQueries({ queryKey: INSIGHTS_KEY });
    },
  });
}
