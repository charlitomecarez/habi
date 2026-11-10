import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, endOfDay, format, startOfDay, subDays } from "date-fns";

import { toDateString } from "@/lib/money";
import { fromHomeSummary, slice } from "@/lib/home-summary";
import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/types/database";

export type DoseStatus = Enums<"dose_status">;
export type Medicine = Omit<Tables<"medicines">, "user_id" | "updated_at">;
export type Dose = Omit<Tables<"medicine_doses">, "user_id" | "created_at">;
export type Visit = Omit<Tables<"health_visits">, "user_id" | "updated_at">;
export type WeightLog = Pick<Tables<"weight_logs">, "id" | "on_date" | "weight_kg">;

const HEALTH_KEY = ["health"] as const;

/** "08:00:00" → "8:00 AM" */
export function timeText(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return format(new Date(2000, 0, 1, h, m), "h:mm a");
}

export function useHealth() {
  return useQuery({
    queryKey: HEALTH_KEY,
    queryFn: () => {
      const fromSummary = (s: Record<string, unknown>) => {
        const [medicines, doses, visits, weights] = ["medicines", "doses", "visits", "weights"].map((k) => slice(s, k));
        if (!medicines || !doses || !visits || !weights) return undefined;
        return {
          medicines: medicines as Medicine[],
          doses: doses as Dose[],
          visits: visits as Visit[],
          weights: weights as WeightLog[],
        };
      };
      return fromHomeSummary(fromSummary, fetchHealth);
    },
  });
}

async function fetchHealth() {
  const now = new Date();
  const [medicines, doses, visits, weights] = await Promise.all([
    supabase.from("medicines").select("id, name, dose, times, start_on, end_on, note, created_at").order("name"),
    supabase
      .from("medicine_doses")
      .select("id, medicine_id, medicine_name, dose, scheduled_at, status, marked_at")
      .gte("scheduled_at", startOfDay(subDays(now, 1)).toISOString())
      .lte("scheduled_at", endOfDay(addDays(now, 1)).toISOString())
      .order("scheduled_at"),
    supabase
      .from("health_visits")
      .select("id, visited_on, doctor, reason, notes, photo_paths, created_at")
      .order("visited_on", { ascending: false }),
    supabase.from("weight_logs").select("id, on_date, weight_kg").order("on_date"),
  ]);
  for (const r of [medicines, doses, visits, weights]) if (r.error) throw r.error;
  return {
    medicines: medicines.data as Medicine[],
    doses: doses.data as Dose[],
    visits: visits.data as Visit[],
    weights: weights.data as WeightLog[],
  };
}

/** Today's doses, in time order. */
export function todaysDoses(doses: Dose[], now = new Date()): Dose[] {
  const day = format(now, "yyyy-MM-dd");
  return doses.filter((d) => format(new Date(d.scheduled_at), "yyyy-MM-dd") === day);
}

/** A medicine is active until its end date has passed. */
export function isActive(m: Pick<Medicine, "end_on">, now = new Date()): boolean {
  return !m.end_on || m.end_on >= format(now, "yyyy-MM-dd");
}

function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: HEALTH_KEY });
}

/** Marks a dose Taken or Skipped (or back to pending). Its reminder goes away once marked. */
export function useMarkDose() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DoseStatus }) => {
      const { error } = await supabase
        .from("medicine_doses")
        .update({ status, marked_at: status === "pending" ? null : new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await client.cancelQueries({ queryKey: HEALTH_KEY });
      const previous = client.getQueryData<{ doses: Dose[] }>(HEALTH_KEY);
      if (previous)
        client.setQueryData(HEALTH_KEY, {
          ...previous,
          doses: previous.doses.map((d) => (d.id === id ? { ...d, status } : d)),
        });
      return { previous };
    },
    onError: (_e, _v, c) => {
      if (c?.previous) client.setQueryData(HEALTH_KEY, c.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: HEALTH_KEY }),
  });
}

export type MedicineInput = {
  name: string;
  dose: string;
  times: string[];
  startOn: Date;
  endOn: Date | null;
  note: string | null;
};

export function useSaveMedicine() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: MedicineInput }) => {
      const fields = {
        name: input.name,
        dose: input.dose,
        times: [...input.times].sort(),
        start_on: toDateString(input.startOn),
        end_on: input.endOn ? toDateString(input.endOn) : null,
        note: input.note,
      };
      const { error } = id
        ? await supabase.from("medicines").update(fields).eq("id", id)
        : await supabase.from("medicines").insert(fields);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteMedicine() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medicines").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export type VisitInput = { visitedOn: Date; doctor: string; reason: string; notes: string | null };

export function useSaveVisit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: VisitInput }): Promise<string> => {
      const fields = {
        visited_on: toDateString(input.visitedOn),
        doctor: input.doctor,
        reason: input.reason,
        notes: input.notes,
      };
      if (id) {
        const { error } = await supabase.from("health_visits").update(fields).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from("health_visits").insert(fields).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSettled: invalidate,
  });
}

export function useSetVisitPhotos() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, paths }: { id: string; paths: string[] }) => {
      const { error } = await supabase.from("health_visits").update({ photo_paths: paths }).eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteVisit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("health_visits").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Logs today's weight; a second log on the same day replaces it. */
export function useLogWeight() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ kg, on }: { kg: number; on: Date }) => {
      const { error } = await supabase
        .from("weight_logs")
        .upsert({ on_date: toDateString(on), weight_kg: kg }, { onConflict: "user_id,on_date" });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteWeight() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weight_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}
