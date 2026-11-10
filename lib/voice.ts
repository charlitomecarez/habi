import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { currentUserId } from "@/lib/photos";
import { fromHomeSummary, slice } from "@/lib/home-summary";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type VoiceMessage = Omit<Tables<"voice_messages">, "user_id" | "recipient_id">;
export type VoiceStatus = "pending" | "ready" | "failed";

const VOICE_KEY = ["voice"] as const;
export const VOICE_BUCKET = "voice-audio";
const MESSAGE_COLUMNS = "id, audio_path, duration_s, transcript, status, read_at, created_at";
const LIST_LIMIT = 50;
/** A pending message this old lost its run, so the app offers Retry. */
const STUCK_MS = 5 * 60 * 1000;

export const MAX_RECORD_SECONDS = 300;

/** "0:18" from seconds. */
export function durationText(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function unreadCount(messages: readonly VoiceMessage[]): number {
  return messages.filter((m) => m.read_at === null).length;
}

/** Whether the sender can send this message again. */
export function canRetry(message: VoiceMessage, now = Date.now()): boolean {
  if (!message.audio_path) return false;
  if (message.status === "failed") return true;
  return message.status === "pending" && now - Date.parse(message.created_at) > STUCK_MS;
}

/** Whether this account has voice, and who it can send to. */
export function useVoiceAccess() {
  return useQuery({
    queryKey: [...VOICE_KEY, "access"],
    queryFn: () => {
      type Access = { isAdmin: boolean; hasAccess: boolean; contacts: { user_id: string; name: string }[] };
      return fromHomeSummary<Access>(
        (s) => {
          const admin = slice<{ user_id: string } | null>(s, "admin");
          const hasAccess = slice<boolean>(s, "has_voice_access");
          const contacts = slice<Access["contacts"]>(s, "voice_contacts");
          if (admin === undefined || hasAccess === undefined || !contacts) return undefined;
          return { isAdmin: admin !== null, hasAccess: hasAccess === true, contacts };
        },
        async () => {
          const [admin, access, contacts] = await Promise.all([
            supabase.from("app_admins").select("user_id").maybeSingle(),
            supabase.rpc("has_voice_access"),
            supabase.rpc("voice_contacts"),
          ]);
          const error = admin.error ?? access.error ?? contacts.error;
          if (error) throw error;
          return { isAdmin: admin.data !== null, hasAccess: access.data === true, contacts: contacts.data ?? [] };
        },
      );
    },
  });
}

/** Every other account, for the admin's ticks. */
export function useVoiceAccounts() {
  return useQuery({
    queryKey: [...VOICE_KEY, "accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_voice_accounts");
      if (error) throw error;
      return data;
    },
  });
}

/** Messages you received. The database shows only the ones with text ready. */
export function useInbox() {
  return useQuery({
    queryKey: [...VOICE_KEY, "inbox"],
    queryFn: () =>
      fromHomeSummary(
        (s) => slice<VoiceMessage[]>(s, "inbox"),
        async (): Promise<VoiceMessage[]> => {
          const { data, error } = await supabase
            .from("voice_messages")
            .select(MESSAGE_COLUMNS)
            .eq("recipient_id", await currentUserId())
            .order("created_at", { ascending: false })
            .limit(LIST_LIMIT);
          if (error) throw error;
          return data;
        },
      ),
  });
}

export function useSent() {
  return useQuery({
    queryKey: [...VOICE_KEY, "sent"],
    queryFn: async (): Promise<VoiceMessage[]> => {
      const { data, error } = await supabase
        .from("voice_messages")
        .select(MESSAGE_COLUMNS)
        .eq("user_id", await currentUserId())
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT);
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateVoice() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: VOICE_KEY });
}

export function useSetVoiceAccess() {
  const invalidate = useInvalidateVoice();
  return useMutation({
    mutationFn: async ({ userId, on }: { userId: string; on: boolean }) => {
      const { error } = await supabase.rpc("set_voice_access", { p_user_id: userId, p_on: on });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Marks the inbox as read. The list refreshes when you leave, so New stays on screen while you read. */
export async function markInboxRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_voice_inbox_read");
  if (error) throw error;
}

export function useRefreshVoice() {
  return useInvalidateVoice();
}

async function callTranscribe(body: Record<string, unknown>): Promise<VoiceStatus> {
  const { data, error } = await supabase.functions.invoke<{ status: VoiceStatus }>("voice-transcribe", { body });
  if (error) throw new Error(await functionError(error));
  return data?.status ?? "failed";
}

/** The function's own sentence when it sent one. */
async function functionError(error: { message: string; context?: unknown }): Promise<string> {
  const context = error.context;
  if (context instanceof Response) {
    const body = (await context.json().catch(() => null)) as { error?: string } | null;
    if (body?.error) return body.error;
  }
  return error.message;
}

export type Recording = {
  /** Made once for each recording, so sending again reuses the same file. */
  id: string;
  uri: string;
  durationS: number;
};

export type VoiceSend = Recording & { recipientId: string };

export function newRecordingId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Uploads the audio, then asks for the text. A failed text still counts as sent, and Sent shows Retry. */
export function useSendVoice() {
  const invalidate = useInvalidateVoice();
  return useMutation({
    mutationFn: async ({ id, uri, durationS, recipientId }: VoiceSend) => {
      const web = !uri.endsWith(".m4a");
      const path = `${await currentUserId()}/${id}.${web ? "webm" : "m4a"}`;
      const body = await (await fetch(uri)).arrayBuffer();
      const { error } = await supabase.storage
        .from(VOICE_BUCKET)
        .upload(path, body, { contentType: web ? "audio/webm" : "audio/mp4" });
      // The file is already there when an earlier try stopped after the upload.
      if (error && !/exists|duplicate/i.test(error.message)) throw error;
      return callTranscribe({ path, durationS, recipientId });
    },
    onSettled: invalidate,
  });
}

export function useRetryVoice() {
  const invalidate = useInvalidateVoice();
  return useMutation({
    mutationFn: (messageId: string) => callTranscribe({ messageId }),
    onSettled: invalidate,
  });
}
