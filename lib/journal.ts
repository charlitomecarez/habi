import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { removePhoto, uploadPhoto, type PhotoChange } from "@/lib/photos";
import { supabase } from "@/lib/supabase";
import type { Enums, Tables } from "@/types/database";

export type Mood = Enums<"journal_mood">;
export type JournalEntry = Omit<Tables<"journal_entries">, "user_id">;

const JOURNAL_KEY = ["journal"] as const;

export const MOODS = [
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "low", label: "Low" },
  { value: "bad", label: "Bad" },
] as const satisfies readonly { value: Mood; label: string }[];

export function moodLabel(mood: Mood | null): string | null {
  return MOODS.find((m) => m.value === mood)?.label ?? null;
}

/** Every entry, newest first. One a day stays small. */
export function useJournal() {
  return useQuery({
    queryKey: JOURNAL_KEY,
    queryFn: async (): Promise<JournalEntry[]> => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, on_date, mood, body, photo_path, created_at, updated_at")
        .order("on_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** The entries on either side of a date. The list is newest first. */
export function entryNeighbours(entries: readonly JournalEntry[], date: string) {
  const index = entries.findIndex((e) => e.on_date === date);
  if (index === -1) return { older: undefined, newer: undefined };
  return { older: entries[index + 1], newer: entries[index - 1] };
}

/** Saves the day's entry; a second save on the same day edits it. */
export function useSaveEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (e: {
      date: string;
      mood: Mood | null;
      body: string;
      photo: PhotoChange;
      currentPath: string | null;
    }) => {
      let photoPath = e.currentPath;
      if (e.photo) photoPath = await uploadPhoto("journal", e.date, e.photo);
      else if (e.photo === null) photoPath = null;
      const { error } = await supabase
        .from("journal_entries")
        .upsert(
          { on_date: e.date, mood: e.mood, body: e.body, photo_path: photoPath },
          { onConflict: "user_id,on_date" },
        );
      if (error) throw error;
      if (e.photo !== undefined && e.currentPath && e.currentPath !== photoPath) await removePhoto(e.currentPath);
    },
    onSettled: () => client.invalidateQueries({ queryKey: JOURNAL_KEY }),
  });
}

export function useDeleteEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (e: Pick<JournalEntry, "id" | "photo_path">) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", e.id);
      if (error) throw error;
      await removePhoto(e.photo_path);
    },
    onSettled: () => client.invalidateQueries({ queryKey: JOURNAL_KEY }),
  });
}
