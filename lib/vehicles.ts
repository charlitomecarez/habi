import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

import { uploadPhoto, type LocalPhoto } from "@/lib/photos";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type Vehicle = Pick<
  Tables<"vehicles">,
  "id" | "nickname" | "make" | "model" | "current_odometer_km" | "created_at"
>;

export type DueStatus = "overdue" | "due_soon" | "ok" | "no_interval";

/** One row of the vehicle_service_due view, with the columns the view always fills. */
export type ServiceDue = {
  vehicleServiceId: string;
  item: string;
  status: DueStatus;
  nextDueKm: number | null;
  nextDueOn: string | null;
  kmRemaining: number | null;
  daysRemaining: number | null;
  sortOrder: number;
};

const VEHICLE_KEY = ["vehicle"] as const;
const dueKey = (vehicleId: string) => ["vehicle-service-due", vehicleId] as const;
const lastReadingKey = (vehicleId: string) => ["odometer-last", vehicleId] as const;

export function vehicleName(vehicle: Pick<Vehicle, "nickname" | "make" | "model">): string {
  return vehicle.nickname ?? `${vehicle.make} ${vehicle.model}`;
}

export function formatKm(km: number): string {
  return km.toLocaleString("en-PH");
}

/** "4,350" or "4350" to 4350; null when it is not a whole number. */
export function parseKm(text: string): number | null {
  const digits = text.replace(/[,\s]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

/** The primary vehicle, else the oldest one. Null when there is none yet. */
export function useVehicle() {
  return useQuery({
    queryKey: VEHICLE_KEY,
    queryFn: async (): Promise<Vehicle | null> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, nickname, make, model, current_odometer_km, created_at")
        .order("is_primary", { ascending: false })
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useServiceDue(vehicleId: string | undefined) {
  return useQuery({
    queryKey: dueKey(vehicleId ?? ""),
    enabled: vehicleId !== undefined,
    queryFn: async (): Promise<ServiceDue[]> => {
      const { data, error } = await supabase
        .from("vehicle_service_due")
        .select("vehicle_service_id, item, status, next_due_km, next_due_on, km_remaining, days_remaining, sort_order")
        .eq("vehicle_id", vehicleId!)
        .order("sort_order");
      if (error) throw error;
      return data.map((row) => ({
        vehicleServiceId: row.vehicle_service_id!,
        item: row.item!,
        status: row.status as DueStatus,
        nextDueKm: row.next_due_km,
        nextDueOn: row.next_due_on,
        kmRemaining: row.km_remaining,
        daysRemaining: row.days_remaining,
        sortOrder: row.sort_order ?? 0,
      }));
    },
  });
}

export function useLastReading(vehicleId: string | undefined) {
  return useQuery({
    queryKey: lastReadingKey(vehicleId ?? ""),
    enabled: vehicleId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("odometer_logs")
        .select("odometer_km, logged_at")
        .eq("vehicle_id", vehicleId!)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateVehicle() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: VEHICLE_KEY }),
      client.invalidateQueries({ queryKey: ["vehicle-service-due"] }),
      client.invalidateQueries({ queryKey: ["odometer-last"] }),
    ]);
}

/** Adds the first vehicle as the default model. The database copies that model's service schedule. */
export function useAddVehicle() {
  const invalidate = useInvalidateVehicle();
  return useMutation({
    mutationFn: async ({ nickname, odometerKm }: { nickname: string | null; odometerKm: number }) => {
      const { data: model, error: modelError } = await supabase
        .from("vehicle_models")
        .select("id, make, model")
        .eq("is_default", true)
        .single();
      if (modelError) throw modelError;
      const { error } = await supabase.from("vehicles").insert({
        model_id: model.id,
        make: model.make,
        model: model.model,
        nickname,
        current_odometer_km: odometerKm,
        is_primary: true,
      });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useLogOdometer() {
  const invalidate = useInvalidateVehicle();
  return useMutation({
    mutationFn: async (input: { vehicleId: string; odometerKm: number; loggedAt: Date; note: string | null }) => {
      const { error } = await supabase.from("odometer_logs").insert({
        vehicle_id: input.vehicleId,
        odometer_km: input.odometerKm,
        logged_at: input.loggedAt.toISOString(),
        note: input.note,
      });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export type ServiceLogInput = {
  vehicleId: string;
  /** An existing service item, or a new item name for "Other". */
  service: { id: string } | { newItem: string };
  odometerKm: number;
  servicedOn: Date;
  cost: number | null;
  shop: string | null;
  notes: string | null;
  receipt: LocalPhoto | null;
};

export function useLogService() {
  const invalidate = useInvalidateVehicle();
  return useMutation({
    mutationFn: async (input: ServiceLogInput) => {
      let serviceId: string;
      if ("id" in input.service) {
        serviceId = input.service.id;
      } else {
        // "Other": a new item on this vehicle with no interval.
        const { data, error } = await supabase
          .from("vehicle_services")
          .insert({ vehicle_id: input.vehicleId, item: input.service.newItem, sort_order: 100 })
          .select("id")
          .single();
        if (error) throw error;
        serviceId = data.id;
      }
      const { data: log, error } = await supabase
        .from("service_logs")
        .insert({
          vehicle_id: input.vehicleId,
          vehicle_service_id: serviceId,
          odometer_km: input.odometerKm,
          serviced_on: format(input.servicedOn, "yyyy-MM-dd"),
          cost: input.cost,
          shop: input.shop,
          notes: input.notes,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (input.receipt) {
        const path = await uploadPhoto("receipts", log.id, input.receipt);
        const { error: receiptError } = await supabase
          .from("service_logs")
          .update({ receipt_path: path })
          .eq("id", log.id);
        if (receiptError) throw receiptError;
      }
    },
    onSettled: invalidate,
  });
}

/** Logs several services that were done at one reading and date, with no cost or shop. */
export function useMarkServicesDone() {
  const invalidate = useInvalidateVehicle();
  return useMutation({
    mutationFn: async (input: { vehicleId: string; serviceIds: string[]; odometerKm: number; servicedOn: Date }) => {
      const servicedOn = format(input.servicedOn, "yyyy-MM-dd");
      const { error } = await supabase.from("service_logs").insert(
        input.serviceIds.map((id) => ({
          vehicle_id: input.vehicleId,
          vehicle_service_id: id,
          odometer_km: input.odometerKm,
          serviced_on: servicedOn,
        })),
      );
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

function plural(n: number, word: string): string {
  return `${formatKm(n)} ${word}${n === 1 ? "" : "s"}`;
}

/** The status line for an item in "Service due now". It always contains a word, not colour only. */
export function dueText(s: ServiceDue): string {
  if (s.status === "overdue") {
    if (s.kmRemaining !== null && s.kmRemaining <= 0) {
      return s.kmRemaining === 0 ? "Due now" : `${formatKm(-s.kmRemaining)} km overdue`;
    }
    if (s.daysRemaining !== null) {
      return s.daysRemaining === 0 ? "Due today" : `${plural(-s.daysRemaining, "day")} overdue`;
    }
    return "Overdue";
  }
  if (s.kmRemaining !== null && s.kmRemaining <= 500) return `Due in ${formatKm(s.kmRemaining)} km`;
  if (s.daysRemaining !== null) return `Due in ${plural(s.daysRemaining, "day")}`;
  return "Due soon";
}

/** When an item in "Later" is next due. */
export function laterText(s: ServiceDue): string {
  if (s.status === "no_interval") return "No interval set";
  const parts: string[] = [];
  if (s.nextDueKm !== null) parts.push(`at ${formatKm(s.nextDueKm)} km`);
  if (s.nextDueOn !== null) parts.push(format(parseISO(s.nextDueOn), "MMM yyyy"));
  return parts.join(" or ");
}

/** Items with a km interval that a new reading would make overdue. */
export function newlyDueAt(services: ServiceDue[], odometerKm: number): ServiceDue[] {
  return services.filter((s) => s.status !== "overdue" && s.nextDueKm !== null && odometerKm >= s.nextDueKm);
}
