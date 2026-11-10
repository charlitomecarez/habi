import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, format, isLeapYear, startOfDay } from "date-fns";

import { fromHomeSummary, slice } from "@/lib/home-summary";
import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/types/database";

export type PersonDateKind = Enums<"person_date_kind">;
export type Person = Pick<Tables<"people">, "id" | "name" | "note">;
export type PersonDate = Pick<Tables<"person_dates">, "id" | "person_id" | "kind" | "label" | "month" | "day" | "year">;
export type GiftIdea = Pick<Tables<"gift_ideas">, "id" | "person_id" | "title" | "price" | "bought_at">;

const PEOPLE_KEY = ["people"] as const;

export const KIND_OPTIONS = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "other", label: "Other" },
] as const satisfies readonly { value: PersonDateKind; label: string }[];

/** The next time a yearly date comes, on or after `from`. Feb 29 is Feb 28 in other years. */
export function nextOccurrence(month: number, day: number, from = new Date()): Date {
  const start = startOfDay(from);
  for (const year of [start.getFullYear(), start.getFullYear() + 1]) {
    const d = month === 2 && day === 29 && !isLeapYear(new Date(year, 0, 1)) ? 28 : day;
    const date = new Date(year, month - 1, d);
    if (date >= start) return date;
  }
  return new Date(start.getFullYear() + 1, month - 1, day);
}

export function dateLabel(d: Pick<PersonDate, "kind" | "label">): string {
  if (d.kind === "other") return d.label?.trim() || "Date";
  return d.kind === "birthday" ? "Birthday" : "Anniversary";
}

/** "Birthday · Nov 11 · in 7 days · turns 30" */
export function occurrenceText(d: PersonDate, now = new Date()): { when: string; days: number; date: Date } {
  const date = nextOccurrence(d.month, d.day, now);
  const days = differenceInCalendarDays(date, startOfDay(now));
  const rel = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  const age = d.year && d.kind !== "other" ? date.getFullYear() - d.year : null;
  const ageText = age === null ? "" : d.kind === "birthday" ? ` · turns ${age}` : ` · ${age} years`;
  return { when: `${format(date, "MMM d")} · ${rel}${ageText}`, days, date };
}

export function usePeople() {
  return useQuery({
    queryKey: PEOPLE_KEY,
    queryFn: () =>
      fromHomeSummary((s) => {
        const people = slice<Person[]>(s, "people");
        const dates = slice<PersonDate[]>(s, "person_dates");
        const gifts = slice<GiftIdea[]>(s, "gift_ideas");
        return people && dates && gifts ? { people, dates, gifts } : undefined;
      }, fetchPeople),
  });
}

async function fetchPeople() {
  const [people, dates, gifts] = await Promise.all([
    supabase.from("people").select("id, name, note").order("name"),
    supabase.from("person_dates").select("id, person_id, kind, label, month, day, year"),
    supabase.from("gift_ideas").select("id, person_id, title, price, bought_at").order("created_at"),
  ]);
  if (people.error) throw people.error;
  if (dates.error) throw dates.error;
  if (gifts.error) throw gifts.error;
  return { people: people.data as Person[], dates: dates.data as PersonDate[], gifts: gifts.data as GiftIdea[] };
}

function useInvalidate() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: PEOPLE_KEY });
    client.invalidateQueries({ queryKey: ["debts"] });
    client.invalidateQueries({ queryKey: ["money"] });
  };
}

export function useSavePerson() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, name, note }: { id?: string; name: string; note: string | null }) => {
      if (id) {
        const { error } = await supabase.from("people").update({ name, note }).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from("people").insert({ name, note }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSettled: invalidate,
  });
}

export function useDeletePerson() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export type PersonDateInput = {
  personId: string;
  kind: PersonDateKind;
  label: string | null;
  month: number;
  day: number;
  year: number | null;
};

export function useSavePersonDate() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: PersonDateInput }) => {
      const fields = {
        person_id: input.personId,
        kind: input.kind,
        label: input.label,
        month: input.month,
        day: input.day,
        year: input.year,
      };
      const { error } = id
        ? await supabase.from("person_dates").update(fields).eq("id", id)
        : await supabase.from("person_dates").insert(fields);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeletePersonDate() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("person_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useAddGift() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (g: { personId: string; title: string; price: number | null }) => {
      const { error } = await supabase
        .from("gift_ideas")
        .insert({ person_id: g.personId, title: g.title, price: g.price });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteGift() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gift_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Marks a gift bought and adds the Money expense in one step. */
export function useBuyGift() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (g: { giftId: string; accountId: string; amount: number }) => {
      const { error } = await supabase.rpc("buy_gift", {
        p_gift_id: g.giftId,
        p_account_id: g.accountId,
        p_amount: g.amount,
      });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}
