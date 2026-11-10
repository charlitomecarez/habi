import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useEffect } from "react";
import { AppState } from "react-native";

import { hasWeightAccess, newWeightToken, readWeightChanges, readWeightsSince } from "@/lib/health-connect";
import { supabase } from "@/lib/supabase";

// Weights from Health Connect go to weight_logs with source 'health_connect'. The first sync reads
// 30 days. After that, a changes token gives only new weights, so a weight that you delete in Habi
// does not come back. A typed weight on the same day always wins (save_health_weights).

export type HealthWeight = { at: number; kg: number };
export type DayWeight = { on_date: string; weight_kg: number };

const SYNC_KEY = "health-weight-sync";
const FIRST_DAYS = 30;

type SyncState = { token: string; syncedAt: string };

/** One weight for each day: the last one of the day, to one decimal. Oldest day first. */
export function dailyWeights(weights: readonly HealthWeight[]): DayWeight[] {
  const byDay = new Map<string, HealthWeight>();
  for (const w of weights) {
    const day = format(w.at, "yyyy-MM-dd");
    const old = byDay.get(day);
    if (!old || w.at > old.at) byDay.set(day, w);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([on_date, w]) => ({ on_date, weight_kg: Math.round(w.kg * 10) / 10 }));
}

async function readState(): Promise<SyncState | null> {
  const text = await AsyncStorage.getItem(SYNC_KEY).catch(() => null);
  return text ? (JSON.parse(text) as SyncState) : null;
}

/** Saves the new Health Connect weights. Returns how many rows changed. */
async function syncWeights(now: Date): Promise<number> {
  if (!(await hasWeightAccess())) return 0;
  const state = await readState();
  let token: string;
  let weights: HealthWeight[];
  const changes = state ? await readWeightChanges(state.token) : null;
  if (changes) {
    ({ token, weights } = changes);
  } else {
    // First sync, or the token expired: take a new token first, so no weight falls between the two.
    token = await newWeightToken();
    weights = await readWeightsSince(state ? new Date(state.syncedAt) : subDays(now, FIRST_DAYS));
  }
  const days = dailyWeights(weights);
  let saved = 0;
  if (days.length) {
    const { data, error } = await supabase.rpc("save_health_weights", { p_weights: days });
    if (error) throw error;
    saved = data;
  }
  await AsyncStorage.setItem(SYNC_KEY, JSON.stringify({ token, syncedAt: now.toISOString() } satisfies SyncState));
  return saved;
}

/** Reads new Health Connect weights when the app opens or comes back to the front. Android only. */
export function useWeightsFromHealthConnect() {
  const client = useQueryClient();
  useEffect(() => {
    let running = false;
    async function check() {
      if (running) return;
      running = true;
      try {
        if ((await syncWeights(new Date())) > 0) await client.invalidateQueries({ queryKey: ["health"] });
      } catch {
        // No weights this time. The next open tries again from the same token.
      } finally {
        running = false;
      }
    }
    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
  }, [client]);
}

/** Sign-out clears this, so that the next account starts with its own first sync. */
export async function clearWeightSync(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_KEY);
}
