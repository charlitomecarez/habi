import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, format, parseISO } from "date-fns";

import { toDateString } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/types/database";

export type DocumentType = Enums<"document_type">;
export type DocumentRow = Omit<Tables<"documents">, "user_id">;

const DOCUMENTS_KEY = ["documents"] as const;
const COLUMNS =
  "id, type, name, number, issued_on, expires_on, remind_days_before, vehicle_id, photo_paths, note, created_at, updated_at";

export const DOCUMENT_TYPES = [
  { value: "lto_registration", label: "LTO registration" },
  { value: "drivers_license", label: "Driver's license" },
  { value: "passport", label: "Passport" },
  { value: "insurance", label: "Insurance" },
  { value: "philhealth", label: "PhilHealth" },
  { value: "other", label: "Other" },
] as const satisfies readonly { value: DocumentType; label: string }[];

export const DEFAULT_REMIND_DAYS = 30;
export const DUE_SOON_DAYS = 30;

export function typeLabel(type: DocumentType): string {
  return DOCUMENT_TYPES.find((t) => t.value === type)?.label ?? "Document";
}

/** Always a word: Expired, Due soon, Valid, No expiry. */
export function documentStatus(d: Pick<DocumentRow, "expires_on">, now = new Date()) {
  if (!d.expires_on) return { text: "No expiry", tone: "neutral" as const, days: null };
  const days = differenceInCalendarDays(parseISO(d.expires_on), now);
  const date = format(parseISO(d.expires_on), "MMM d, yyyy");
  if (days < 0) return { text: `Expired ${date}`, tone: "danger" as const, days };
  if (days <= DUE_SOON_DAYS)
    return {
      text: `Due soon · ${days === 0 ? "today" : `in ${days} ${days === 1 ? "day" : "days"}`}`,
      tone: "warning" as const,
      days,
    };
  return { text: `Valid until ${date}`, tone: "neutral" as const, days };
}

/** Every document, soonest expiry first; ones without an expiry last. */
export function useDocuments() {
  return useQuery({
    queryKey: DOCUMENTS_KEY,
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select(COLUMNS)
        .order("expires_on", { ascending: true, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useDocument(id: string) {
  const docs = useDocuments();
  return { ...docs, data: docs.data?.find((d) => d.id === id) };
}

export type DocumentInput = {
  type: DocumentType;
  name: string;
  number: string | null;
  issuedOn: Date | null;
  expiresOn: Date | null;
  remindDaysBefore: number;
  vehicleId: string | null;
  note: string | null;
};

export function useSaveDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: DocumentInput }) => {
      const fields = {
        type: input.type,
        name: input.name,
        number: input.number,
        issued_on: input.issuedOn ? toDateString(input.issuedOn) : null,
        expires_on: input.expiresOn ? toDateString(input.expiresOn) : null,
        remind_days_before: input.remindDaysBefore,
        vehicle_id: input.vehicleId,
        note: input.note,
      };
      const { error } = id
        ? await supabase.from("documents").update(fields).eq("id", id)
        : await supabase.from("documents").insert(fields);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useSetDocumentPhotos() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paths }: { id: string; paths: string[] }) => {
      const { error } = await supabase.from("documents").update({ photo_paths: paths }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useDeleteDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}
