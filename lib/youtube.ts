import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { differenceInCalendarDays, format, isToday, isYesterday, parseISO } from "date-fns";
import { Linking } from "react-native";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

// Videos from the channels you follow. The server reads each channel's public feed; the app never
// signs in to YouTube. You see only the videos of your own channels (follower RLS).

export type Channel = Pick<Tables<"youtube_channels">, "id" | "channel_id" | "title" | "created_at">;
export type Video = Tables<"youtube_videos">;
export type Feed = Tables<"youtube_feeds">;

export const MAX_CHANNELS = 30;
export const ALL_CHANNELS = "all";

const KEY = ["youtube"] as const;

/** The thumbnail from the video ID, so the table stores no image link. */
export const thumbUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

/** "14:02" or "1:02:30". */
export function durationText(seconds: number | null): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** "3 h ago", "Yesterday", "4 days ago" or "Oct 2". */
export function ageText(publishedAt: string, now = new Date()): string {
  const at = parseISO(publishedAt);
  const minutes = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  if (isToday(at) || minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  const days = differenceInCalendarDays(now, at);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return format(at, "MMM d");
}

export type VideoGroup = { title: string; videos: Video[] };

/** Groups newest first: Today, Yesterday, then each date. */
export function groupVideos(videos: readonly Video[]): VideoGroup[] {
  const groups: VideoGroup[] = [];
  for (const v of videos) {
    const at = parseISO(v.published_at);
    const title = isToday(at) ? "Today" : isYesterday(at) ? "Yesterday" : format(at, "EEEE, MMM d");
    const last = groups.at(-1);
    if (last?.title === title) last.videos.push(v);
    else groups.push({ title, videos: [v] });
  }
  return groups;
}

/** A channel whose last check failed after its last good one. */
export function feedFailed(feed: Pick<Feed, "last_ok_at" | "last_error_at"> | undefined): boolean {
  return !!feed?.last_error_at && (!feed.last_ok_at || feed.last_error_at > feed.last_ok_at);
}

export const openVideo = (videoId: string) =>
  Linking.openURL(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);

/** Your channels, the videos of the last 60 days, and when each feed was last read. */
export function useYouTube() {
  return useQuery({
    queryKey: KEY,
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      const [channels, videos, feeds] = await Promise.all([
        supabase.from("youtube_channels").select("id, channel_id, title, created_at").order("title"),
        supabase.from("youtube_videos").select("*").order("published_at", { ascending: false }).limit(500),
        supabase.from("youtube_feeds").select("*"),
      ]);
      if (channels.error) throw channels.error;
      if (videos.error) throw videos.error;
      if (feeds.error) throw feeds.error;
      return { channels: channels.data, videos: videos.data, feeds: feeds.data };
    },
  });
}

async function functionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body?.error) return body.error;
  }
  return "Could not add the channel. Check your connection.";
}

/** Adds a channel by its link or @handle. The server finds it and loads its last videos. */
export function useAddChannel() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: string) => {
      const { data, error } = await supabase.functions.invoke<{ channel_id: string; title: string }>(
        "youtube-channel",
        {
          body: { input },
        },
      );
      if (error) throw new Error(await functionError(error));
      return data!;
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveChannel() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("youtube_channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** Undo: the channel comes back. Its videos stay in the cache until the next morning's check. */
export function useRestoreChannel() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (c: Pick<Channel, "channel_id" | "title">) => {
      const { error } = await supabase.from("youtube_channels").insert({ channel_id: c.channel_id, title: c.title });
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
