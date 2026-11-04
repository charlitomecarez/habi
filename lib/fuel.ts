import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { toDateString } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type FuelLog = Omit<Tables<"fuel_logs">, "user_id">;

const KEY = ["fuel"] as const;

export type Economy = { kmPerLitre: number; km: number; litres: number; to: FuelLog };

/**
 * km per litre between full-tank fill-ups: the distance from one full tank to the next, over the
 * litres put in after the first, up to and including the second. Oldest first.
 */
export function economy(logs: FuelLog[]): Economy[] {
  const sorted = [...logs].sort((a, b) => a.odometer_km - b.odometer_km);
  const out: Economy[] = [];
  let lastFull: FuelLog | null = null;
  let litres = 0;
  for (const l of sorted) {
    if (lastFull) litres += l.litres;
    if (l.full_tank) {
      if (lastFull && l.odometer_km > lastFull.odometer_km && litres > 0) {
        const km = l.odometer_km - lastFull.odometer_km;
        out.push({ kmPerLitre: km / litres, km, litres, to: l });
      }
      lastFull = l;
      litres = 0;
    }
  }
  return out;
}

export function useFuelLogs(vehicleId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, vehicleId],
    enabled: Boolean(vehicleId),
    queryFn: async (): Promise<FuelLog[]> => {
      const { data, error } = await supabase
        .from("fuel_logs")
        .select(
          "id, vehicle_id, filled_on, litres, price_per_litre, total, full_tank, odometer_km, station, odometer_log_id, transaction_id, created_at",
        )
        .eq("vehicle_id", vehicleId!)
        .order("filled_on", { ascending: false })
        .order("odometer_km", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Fuel spent in the calendar month of `now`. */
export function monthFuelCost(logs: FuelLog[], now = new Date()): number {
  const m = format(now, "yyyy-MM");
  return logs.filter((l) => l.filled_on.startsWith(m)).reduce((s, l) => s + l.total, 0);
}

export type FuelInput = {
  vehicleId: string;
  filledOn: Date;
  litres: number;
  pricePerLitre: number;
  odometerKm: number;
  fullTank: boolean;
  station: string;
  accountId: string;
  categoryId: string | null;
};

/** Writes the fill-up, its odometer reading and its Money expense in one step. */
export function useLogFuel() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (f: FuelInput) => {
      const { error } = await supabase.rpc("log_fuel", {
        p_vehicle_id: f.vehicleId,
        p_filled_on: toDateString(f.filledOn),
        p_litres: f.litres,
        p_price_per_litre: f.pricePerLitre,
        p_odometer_km: f.odometerKm,
        p_full_tank: f.fullTank,
        p_station: f.station,
        p_account_id: f.accountId,
        p_category_id: f.categoryId,
      });
      if (error) throw error;
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: KEY });
      client.invalidateQueries({ queryKey: ["money"] });
      // The odometer reading moves the vehicle and its service due dates.
      client.invalidateQueries({ queryKey: ["vehicle"] });
      client.invalidateQueries({ queryKey: ["vehicle-service-due"] });
      client.invalidateQueries({ queryKey: ["odometer-last"] });
    },
  });
}

/** Deletes a fill-up and its expense. The odometer reading stays. */
export function useDeleteFuel() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: KEY });
      client.invalidateQueries({ queryKey: ["money"] });
    },
  });
}
