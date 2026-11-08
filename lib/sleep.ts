import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useEffect } from "react";
import { AppState } from "react-native";

import { readScreenEvents } from "@/lib/screen-time";
import { findSleep, nightWindow } from "@/lib/sleep-detect";
import { weekDays } from "@/lib/week";
import type { Strand, WeaveRow } from "@/lib/weave";

// Sleep comes from when the screen was off (Android), or you type it. It stays on this phone.

const SLEEP_KEY = "sleep-log";
const KEEP_DAYS = 30;

/**
 * Times as HH:mm, keyed by the day you woke up. `source` says where it came from. An entry with no
 * source was typed in v1.3.0. The screen never writes over a typed entry.
 */
export type SleepEntry = { bed: string; wake: string; source?: "screen" | "typed" };
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
      const next = trimLog({ ...log, [format(day, "yyyy-MM-dd")]: { ...entry, source: "typed" } }, day);
      await AsyncStorage.setItem(SLEEP_KEY, JSON.stringify(next));
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** True when the screen may write this day's entry: there is none, or the screen wrote it. */
export const screenMayWrite = (entry: SleepEntry | undefined) => !entry || entry.source === "screen";

/**
 * Reads last night's sleep from the screen when the app opens or comes back to the front. Before
 * noon the night is still open, so the entry can grow. A typed entry stays as you typed it.
 */
export function useSleepFromScreen(onSaved?: () => void) {
  const client = useQueryClient();
  useEffect(() => {
    let running = false;
    async function check() {
      if (running) return;
      running = true;
      try {
        const now = new Date();
        const key = format(now, "yyyy-MM-dd");
        const log = await readLog();
        if (!screenMayWrite(log[key])) return;
        const window = nightWindow(now);
        const events = await readScreenEvents(window.start, Math.min(window.end, now.getTime()));
        if (!events) return;
        const sleep = findSleep(events, now, now.getTime());
        if (!sleep) return;
        const entry: SleepEntry = {
          bed: format(sleep.start, "HH:mm"),
          wake: format(sleep.end, "HH:mm"),
          source: "screen",
        };
        const old = log[key];
        if (old && old.bed === entry.bed && old.wake === entry.wake) return;
        await AsyncStorage.setItem(SLEEP_KEY, JSON.stringify(trimLog({ ...log, [key]: entry }, now)));
        await client.invalidateQueries({ queryKey: KEY });
        onSaved?.();
      } catch {
        // No sleep from the screen this time. The typed sheet still works.
      } finally {
        running = false;
      }
    }
    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
  }, [client, onSaved]);
}

/** Sign-out clears this, so that the next account sees none of it. */
export async function clearSleepLog(): Promise<void> {
  await AsyncStorage.removeItem(SLEEP_KEY);
}
