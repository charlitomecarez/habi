import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { weekDays } from "@/lib/week";

// Ticks only matter for the day or the week, so they stay on this phone.

const CHECKS_KEY = "vehicle-checks";

export type CheckList = "daily" | "weekly";
export type Check = { id: string; label: string };

export const DAILY_CHECKS: readonly Check[] = [
  { id: "tires", label: "Check tire condition" },
  { id: "brakes", label: "Check front and rear brakes" },
  { id: "oil", label: "Check engine oil level and leaks" },
  { id: "coolant", label: "Check coolant level" },
  { id: "lights", label: "Check headlights and signal lights" },
  { id: "noises", label: "Check for unusual engine/CVT noises" },
];

export const WEEKLY_CHECKS: readonly Check[] = [
  { id: "pressure", label: "Check tire pressure" },
  { id: "tread", label: "Check tire tread and damage" },
  { id: "pads", label: "Inspect brake pads visually" },
  { id: "leaks", label: "Inspect for fluid leaks" },
  { id: "suspension", label: "Check suspension for leaks" },
];

export type CheckTicks = { day: string; daily: string[]; week: string; weekly: string[] };

const dayKey = (now: Date) => format(now, "yyyy-MM-dd");
const weekKey = (now: Date) => format(weekDays(now)[0], "yyyy-MM-dd");

/** Today's ticks. A new day clears the daily list, and a new Monday clears the weekly list. */
export function currentTicks(saved: CheckTicks | null | undefined, now: Date): CheckTicks {
  const day = dayKey(now);
  const week = weekKey(now);
  return {
    day,
    week,
    daily: saved?.day === day ? saved.daily : [],
    weekly: saved?.week === week ? saved.weekly : [],
  };
}

export function toggleTick(saved: CheckTicks | null | undefined, list: CheckList, id: string, now: Date): CheckTicks {
  const ticks = currentTicks(saved, now);
  const ids = ticks[list];
  return { ...ticks, [list]: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] };
}

async function readTicks(): Promise<CheckTicks | null> {
  const text = await AsyncStorage.getItem(CHECKS_KEY).catch(() => null);
  return text ? (JSON.parse(text) as CheckTicks) : null;
}

const KEY = ["vehicle-checks"] as const;

/** The ticks for right now, even when the app stayed open past midnight. */
export function useVehicleChecks(): CheckTicks {
  const query = useQuery({ queryKey: KEY, queryFn: readTicks });
  return currentTicks(query.data, new Date());
}

export function useToggleVehicleCheck() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ list, id }: { list: CheckList; id: string }) => {
      const next = toggleTick(client.getQueryData<CheckTicks | null>(KEY), list, id, new Date());
      client.setQueryData(KEY, next);
      await AsyncStorage.setItem(CHECKS_KEY, JSON.stringify(next));
    },
    onError: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** Ticks on the phone must not reach the next account. */
export async function clearVehicleChecks() {
  await AsyncStorage.removeItem(CHECKS_KEY).catch(() => undefined);
}
