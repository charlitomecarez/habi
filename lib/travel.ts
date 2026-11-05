import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, format, parse, parseISO } from "date-fns";

import type { ExchangeRate } from "@/lib/money";
import { formatPeso, toDateString } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/types/database";

export type TripItemKind = Enums<"trip_item_kind">;
export type Trip = Omit<Tables<"trips">, "user_id" | "updated_at" | "created_at">;
export type TripItem = Omit<Tables<"trip_items">, "user_id" | "updated_at" | "created_at">;

const TRAVEL_KEY = ["travel"] as const;
const TRIP_COLUMNS = "id, title, destination, start_date, end_date, budget_php, status, note";
const ITEM_COLUMNS =
  "id, trip_id, kind, title, day, start_time, place, map_url, cost, currency, booking_ref, note, done, transaction_id, document_id";

export const KIND_OPTIONS = [
  { value: "go", label: "Go" },
  { value: "stay", label: "Stay" },
  { value: "eat", label: "Eat" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
] as const satisfies readonly { value: TripItemKind; label: string }[];

export function kindLabel(kind: TripItemKind): string {
  return KIND_OPTIONS.find((k) => k.value === kind)?.label ?? "Other";
}

/** "6:00 AM" from a database time. */
export function timeText(time: string | null): string | null {
  return time ? format(parse(time.slice(0, 5), "HH:mm", new Date()), "h:mm a") : null;
}

/** "Dec 12 to 14", or "Dec 30 to Jan 2" across months. */
export function tripDatesText(trip: Pick<Trip, "start_date" | "end_date">): string {
  const start = parseISO(trip.start_date);
  const end = parseISO(trip.end_date);
  if (trip.start_date === trip.end_date) return format(start, "MMM d");
  return `${format(start, "MMM d")} to ${format(end, start.getMonth() === end.getMonth() ? "d" : "MMM d")}`;
}

export function tripLength(trip: Pick<Trip, "start_date" | "end_date">): number {
  return differenceInCalendarDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;
}

/** Every date of the trip, in order. */
export function tripDays(trip: Pick<Trip, "start_date" | "end_date">): string[] {
  return Array.from({ length: tripLength(trip) }, (_, i) => toDateString(addDays(parseISO(trip.start_date), i)));
}

export type DayGroup = { day: string; items: TripItem[] };

const byTime = (a: TripItem, b: TripItem) =>
  (a.start_time ?? "99").localeCompare(b.start_time ?? "99") || a.title.localeCompare(b.title);

/** Items under each day of the trip, by time. An item with no day stays in Ideas. A day moved off the trip still shows. */
export function groupByDay(
  items: readonly TripItem[],
  trip: Pick<Trip, "start_date" | "end_date">,
): { days: DayGroup[]; ideas: TripItem[] } {
  const dated = items.filter((i) => i.day !== null);
  const all = [...new Set([...tripDays(trip), ...dated.map((i) => i.day!)])].sort();
  return {
    days: all.map((day) => ({ day, items: dated.filter((i) => i.day === day).sort(byTime) })),
    ideas: items.filter((i) => i.day === null).sort(byTime),
  };
}

export type TripTotals = {
  /** Planned costs in PHP. Ideas with no day count too, because they are still plans. */
  planned: number;
  paid: number;
  /** Currencies with costs but no rate, so the total leaves them out. */
  missingRates: string[];
};

/** Adds the costs, with the existing exchange rates. */
export function tripTotals(items: readonly TripItem[], rates: readonly ExchangeRate[]): TripTotals {
  const missing = new Set<string>();
  let planned = 0;
  let paid = 0;
  for (const item of items) {
    if (item.cost === null) continue;
    const rate = item.currency === "PHP" ? 1 : rates.find((r) => r.currency === item.currency)?.rateToPhp;
    if (rate === undefined) {
      missing.add(item.currency);
      continue;
    }
    planned += item.cost * rate;
    if (item.transaction_id) paid += item.cost * rate;
  }
  return { planned, paid, missingRates: [...missing] };
}

/** A Google Maps link for a place. It needs no key and no SDK. */
export function mapLink(item: Pick<TripItem, "map_url" | "place">): string | null {
  if (item.map_url && safeLink(item.map_url)) return item.map_url;
  const place = item.place?.trim();
  return place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null;
}

const safeLink = (url: string) => /^https?:\/\//i.test(url.trim());

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * The page for the PDF. Friends can forward a PDF, so booking references, notes and ideas never
 * go in it, and costs only with the switch on. All text you typed is escaped.
 */
export function tripHtml(
  trip: Pick<Trip, "title" | "destination" | "start_date" | "end_date">,
  items: readonly TripItem[],
  { includeCosts }: { includeCosts: boolean },
): string {
  const { days } = groupByDay(items, trip);
  const sections = days
    .filter((d) => d.items.length > 0)
    .map((d) => {
      const rows = d.items
        .map((item) => {
          const link = mapLink(item);
          const place = item.place ? ` · ${escapeHtml(item.place)}` : "";
          const map = link ? ` · <a href="${escapeHtml(link)}">Map</a>` : "";
          const cost = includeCosts && item.cost !== null ? `<td class="c">${escapeHtml(costText(item))}</td>` : "";
          return `<tr><td class="t">${escapeHtml(timeText(item.start_time) ?? "")}</td><td>${escapeHtml(item.title)}${place}${map}</td>${cost}</tr>`;
        })
        .join("");
      return `<h2>${escapeHtml(format(parseISO(d.day), "EEEE, MMMM d"))}</h2><table>${rows}</table>`;
    })
    .join("");
  const destination = trip.destination ? `${escapeHtml(trip.destination)} · ` : "";
  const length = tripLength(trip);

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(trip.title)}</title><style>
body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#1a1c1e;margin:32px;font-size:14px}
h1{font-size:26px;margin:0 0 4px}p{color:#5b6168;margin:0 0 20px}h2{font-size:15px;margin:22px 0 6px}
table{width:100%;border-collapse:collapse}td{padding:7px 8px 7px 0;border-bottom:1px solid #e3e5e0;vertical-align:top}
.t{width:76px;color:#5b6168;white-space:nowrap}.c{text-align:right;white-space:nowrap}a{color:#0f766e}
</style></head><body><h1>${escapeHtml(trip.title)}</h1><p>${destination}${escapeHtml(tripDatesText(trip))} · ${length} ${length === 1 ? "day" : "days"}</p>${sections}</body></html>`;
}

export function costText(item: Pick<TripItem, "cost" | "currency">): string {
  if (item.cost === null) return "";
  return item.currency === "PHP" ? formatPeso(item.cost) : `${item.currency} ${item.cost.toFixed(2)}`;
}

/** Every trip, soonest first. One user's trips stay few, so screens filter in memory. */
export function useTrips() {
  return useQuery({
    queryKey: [...TRAVEL_KEY, "trips"],
    queryFn: async (): Promise<Trip[]> => {
      const { data, error } = await supabase.from("trips").select(TRIP_COLUMNS).order("start_date");
      if (error) throw error;
      return data;
    },
  });
}

export function useTrip(id: string) {
  const trips = useTrips();
  return { ...trips, data: trips.data?.find((t) => t.id === id) };
}

export function useTripItems(tripId: string) {
  return useQuery({
    queryKey: [...TRAVEL_KEY, "items", tripId],
    queryFn: async (): Promise<TripItem[]> => {
      const { data, error } = await supabase.from("trip_items").select(ITEM_COLUMNS).eq("trip_id", tripId);
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: TRAVEL_KEY });
}

export type TripInput = {
  title: string;
  destination: string | null;
  startDate: Date;
  endDate: Date;
  budget: number | null;
  note: string | null;
};

export function useSaveTrip() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TripInput }): Promise<string> => {
      const fields = {
        title: input.title,
        destination: input.destination,
        start_date: toDateString(input.startDate),
        end_date: toDateString(input.endDate),
        budget_php: input.budget,
        note: input.note,
      };
      if (id) {
        const { error } = await supabase.from("trips").update(fields).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from("trips").insert(fields).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSettled: invalidate,
  });
}

export function useDeleteTrip() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export type TripItemInput = Pick<
  TripItem,
  | "trip_id"
  | "kind"
  | "title"
  | "day"
  | "start_time"
  | "place"
  | "map_url"
  | "cost"
  | "currency"
  | "booking_ref"
  | "note"
  | "document_id"
>;

export function useSaveTripItem() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TripItemInput }) => {
      const { error } = id
        ? await supabase.from("trip_items").update(input).eq("id", id)
        : await supabase.from("trip_items").insert(input);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteTripItem() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Adds one expense. It changes no account balance. */
export function useMarkPaid() {
  const client = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (paid: { itemId: string; accountId: string; amount: number }) => {
      const { error } = await supabase.rpc("mark_trip_item_paid", {
        p_item_id: paid.itemId,
        p_account_id: paid.accountId,
        p_amount: paid.amount,
      });
      if (error) throw error;
    },
    onSettled: () => {
      invalidate();
      client.invalidateQueries({ queryKey: ["money"] });
    },
  });
}
