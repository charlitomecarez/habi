import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Device from "expo-device";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type Report = Tables<"feedback">;
export type ReportKind = "bug" | "idea";

const KEY = ["feedback"] as const;

export function useSendReport() {
  return useMutation({
    mutationFn: async (input: { kind: ReportKind; message: string }) => {
      const { error } = await supabase.from("feedback").insert({
        kind: input.kind,
        message: input.message,
        app_version: Constants.expoConfig?.version ?? null,
        device_model: Device.modelName,
      });
      if (error) throw error;
    },
  });
}

/** Every report for the admin. RLS returns only your own to anyone else. */
export function useReports() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkReportRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
