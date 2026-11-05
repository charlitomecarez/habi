import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, format, startOfDay, subDays } from "date-fns";

import { supabase } from "@/lib/supabase";
import { BACKUP_ULAM } from "@/lib/ulam-backup";
import { MAX_LIMIT, OPTIONS_PER_DAY, RICE_KCAL, type Ulam } from "@/supabase/functions/_shared/ulam";
import type { Json } from "@/types/database";

export { RICE_KCAL };
export type { Ulam };

export const WEEK_DAYS = 7;

/** What you typed instead of the suggestion. */
export type CustomMeal = { name: string; cost: number | null; kcal: number | null };

export type UlamDay = {
  on_date: string;
  options: Ulam[];
  picked: number;
  custom: CustomMeal | null;
  source: "groq" | "backup" | "you";
  eaten: boolean;
};

const ULAM_KEY = ["ulam"] as const;
const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

/** The backup ulam for a day: the same on every device, and within the limit. */
export function bundledUlam(day: Date, limit = MAX_LIMIT): Ulam[] {
  const fits = BACKUP_ULAM.filter((u) => u.cost <= limit);
  const pool = fits.length > 0 ? fits : BACKUP_ULAM;
  const start = Math.abs(differenceInCalendarDays(day, new Date(2026, 0, 1))) % pool.length;
  return Array.from({ length: Math.min(OPTIONS_PER_DAY, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}

export type TodayChoice = { options: Ulam[]; picked: number; ulam: Ulam; backup: boolean };

/** Today's choices: the stored row, or the backup when it is missing or empty. */
export function todayChoice(row: UlamDay | undefined, day: Date, limit = MAX_LIMIT): TodayChoice {
  const stored = row?.options ?? [];
  const backup = stored.length === 0;
  const options = backup ? bundledUlam(day, limit) : stored;
  const picked = (row?.picked ?? 0) % options.length;
  return { options, picked, ulam: options[picked], backup };
}

export type WeekRow = {
  date: string;
  day: string;
  isToday: boolean;
  /** What you ate, or for today what is suggested. Null when nothing is known. */
  name: string | null;
  cost: number | null;
  kcal: number | null;
  eaten: boolean;
};

function mealOf(row: UlamDay | undefined): Pick<WeekRow, "name" | "cost" | "kcal"> {
  if (row?.custom) return row.custom;
  const ulam = row?.options[row.picked];
  return { name: ulam?.name ?? null, cost: ulam?.cost ?? null, kcal: ulam?.kcal ?? null };
}

/** Seven rows, today first. Older rows never show, whatever the table still holds. */
export function weekRows(rows: readonly UlamDay[], now = new Date()): WeekRow[] {
  const byDate = new Map(rows.map((r) => [r.on_date, r]));
  return Array.from({ length: WEEK_DAYS }, (_, i) => {
    const date = subDays(startOfDay(now), i);
    const row = byDate.get(dayKey(date));
    const eaten = row?.eaten ?? false;
    const meal = mealOf(row);
    const show = eaten || i === 0;
    return {
      date: dayKey(date),
      day: format(date, "EEE"),
      isToday: i === 0,
      name: show ? meal.name : null,
      cost: show ? meal.cost : null,
      kcal: show ? meal.kcal : null,
      eaten,
    };
  });
}

export type WeekSummary = { spent: number; logged: number; averageKcalWithRice: number | null };

/** Counts only what you marked as eaten. */
export function weekSummary(rows: readonly WeekRow[]): WeekSummary {
  const eaten = rows.filter((r) => r.eaten);
  const kcals = eaten.flatMap((r) => (r.kcal === null ? [] : [r.kcal + RICE_KCAL]));
  return {
    spent: eaten.reduce((total, r) => total + (r.cost ?? 0), 0),
    logged: eaten.length,
    averageKcalWithRice: kcals.length > 0 ? Math.round(kcals.reduce((a, b) => a + b, 0) / kcals.length) : null,
  };
}

/** The last 7 days. The app only reads this table, so a refresh never calls Groq. */
export function useUlamDays() {
  const today = startOfDay(new Date());
  return useQuery({
    queryKey: [...ULAM_KEY, dayKey(today)],
    queryFn: async (): Promise<UlamDay[]> => {
      const { data, error } = await supabase
        .from("ulam_days")
        .select("on_date, options, picked, custom, source, eaten")
        .gte("on_date", dayKey(subDays(today, WEEK_DAYS - 1)))
        .lt("on_date", dayKey(addDays(today, 1)));
      if (error) throw error;
      return data as unknown as UlamDay[];
    },
  });
}

type DayChange = {
  date: string;
  options?: Ulam[];
  picked?: number;
  custom?: CustomMeal | null;
  source?: UlamDay["source"];
  eaten?: boolean;
};

/** Changes one day. Fields left out keep their value, and a missing row is made. */
export function useSaveUlamDay() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, options, custom, ...fields }: DayChange) => {
      const { error } = await supabase.from("ulam_days").upsert(
        {
          on_date: date,
          ...fields,
          ...(options === undefined ? {} : { options: options as unknown as Json }),
          ...(custom === undefined ? {} : { custom: custom as unknown as Json }),
        },
        { onConflict: "user_id,on_date" },
      );
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: ULAM_KEY }),
  });
}
