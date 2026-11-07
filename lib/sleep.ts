import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

import { weekDays } from "@/lib/week";
import type { Strand, WeaveRow } from "@/lib/weave";

// You type your sleep, because a phone alone cannot measure it. It stays on this phone.

const SLEEP_KEY = "sleep-log";
const KEEP_DAYS = 30;

/** Times as HH:mm, keyed by the day you woke up. */
export type SleepEntry = { bed: string; wake: string };
export type SleepLog = Record<string, SleepEntry>;

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** A wake time before the bedtime means the next day. */
export function sleepMinutes({ bed, wake }: SleepEntry): number {
  const gap = minutesOf(wake) - minutesOf(bed);
  return gap <= 0 ? gap + 24 * 60 : gap;
}

export function sleepText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** 7 hours or more is good, 6 to 7 hours is watch, and under 6 hours is over. */
export function sleepStrand(minutes: number): Strand {
  if (minutes >= 7 * 60) return "good";
  return minutes >= 6 * 60 ? "watch" : "over";
}

export function sleepRow(log: SleepLog, now: Date): WeaveRow {
  const parts = weekDays(now).map((d) => {
    const entry = log[format(d, "yyyy-MM-dd")];
    if (!entry) return { state: "empty" as const, detail: "Not logged" };
    const minutes = sleepMinutes(entry);
    return { state: sleepStrand(minutes), detail: sleepText(minutes) };
  });
  return { label: "Sleep", days: parts.map((p) => p.state), details: parts.map((p) => p.detail) };
}

/** Drops entries that are older than the keep window. */
export function trimLog(log: SleepLog, now: Date): SleepLog {
  const oldest = format(subDays(now, KEEP_DAYS), "yyyy-MM-dd");
  return Object.fromEntries(Object.entries(log).filter(([day]) => day >= oldest));
}

async function readLog(): Promise<SleepLog> {
  const text = await AsyncStorage.getItem(SLEEP_KEY).catch(() => null);
  return text ? (JSON.parse(text) as SleepLog) : {};
}

const KEY = ["sleep"] as const;

export function useSleepLog() {
  return useQuery({ queryKey: KEY, queryFn: readLog });
}

export function useSaveSleep() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ day, entry }: { day: Date; entry: SleepEntry }) => {
      const log = await readLog();
      const next = trimLog({ ...log, [format(day, "yyyy-MM-dd")]: entry }, day);
      await AsyncStorage.setItem(SLEEP_KEY, JSON.stringify(next));
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** Sign-out clears this, so that the next account sees none of it. */
export async function clearSleepLog(): Promise<void> {
  await AsyncStorage.removeItem(SLEEP_KEY);
}
