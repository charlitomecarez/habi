import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { type StageId, type VideoFormat } from "@/lib/content/stages";
import { supabase } from "@/lib/supabase";
import type { Json, Tables, TablesUpdate } from "@/types/database";

export type Post = { platform: string; postedAt: string; url: string };

export type Video = Omit<Tables<"content_videos">, "user_id" | "posts"> & { posts: Post[] };

export type VideoTask = Pick<Tables<"todos">, "id" | "title" | "due_at" | "completed_at" | "video_id">;

const CONTENT_KEY = ["content"] as const;
const VIDEOS_KEY = [...CONTENT_KEY, "videos"] as const;
const COLUMNS =
  "id, title, stage, format, platforms, publish_on, priority, hook, notes, project_slug, done_steps, posts, created_at, updated_at";

function toVideo(row: Omit<Tables<"content_videos">, "user_id">): Video {
  return { ...row, posts: Array.isArray(row.posts) ? (row.posts as unknown as Post[]) : [] };
}

/** Every video, newest first. One user's planner stays small, so the screens filter in memory. */
export function useVideos() {
  return useQuery({
    queryKey: VIDEOS_KEY,
    queryFn: async (): Promise<Video[]> => {
      const { data, error } = await supabase
        .from("content_videos")
        .select(COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(toVideo);
    },
  });
}

export function useVideo(id: string) {
  const videos = useVideos();
  return { ...videos, data: videos.data?.find((v) => v.id === id) };
}

export type VideoInput = {
  title: string;
  stage?: StageId;
  format?: VideoFormat;
  platforms?: string[];
  publish_on?: string | null;
  priority?: number;
  hook?: string;
  notes?: string;
  project_slug?: string;
  done_steps?: string[];
  posts?: Post[];
};

function toRow(input: Partial<VideoInput>): TablesUpdate<"content_videos"> {
  const { posts, ...rest } = input;
  return posts ? { ...rest, posts: posts as unknown as Json } : rest;
}

/** Adds a video, or changes the given fields of one. The list updates before the server answers. */
export function useSaveVideo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: Partial<VideoInput> }): Promise<string> => {
      if (id) {
        const { error } = await supabase.from("content_videos").update(toRow(input)).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("content_videos")
        .insert({ ...toRow(input), title: input.title ?? "Untitled" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onMutate: async ({ id, input }) => {
      if (!id) return { previous: undefined };
      await client.cancelQueries({ queryKey: VIDEOS_KEY });
      const previous = client.getQueryData<Video[]>(VIDEOS_KEY);
      client.setQueryData<Video[]>(VIDEOS_KEY, (videos) => videos?.map((v) => (v.id === id ? { ...v, ...input } : v)));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(VIDEOS_KEY, context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: CONTENT_KEY }),
  });
}

export function useDeleteVideo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: CONTENT_KEY });
      client.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

/** A video's tasks. They are todos, so they also show in Todos and get its reminders. */
export function useVideoTasks(videoId: string) {
  return useQuery({
    // Under "todos", so saving or ticking a todo anywhere refreshes this list too.
    queryKey: ["todos", "video", videoId],
    queryFn: async (): Promise<VideoTask[]> => {
      const { data, error } = await supabase
        .from("todos")
        .select("id, title, due_at, completed_at, video_id")
        .eq("video_id", videoId)
        .order("completed_at", { ascending: true, nullsFirst: true })
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useAddVideoTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, title, dueAt }: { videoId: string; title: string; dueAt: Date | null }) => {
      const { error } = await supabase.from("todos").insert({
        title,
        video_id: videoId,
        due_at: dueAt?.toISOString() ?? null,
        // Remind at the due time, the same as a todo with a due date.
        remind_at: dueAt?.toISOString() ?? null,
      });
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["todos"] }),
  });
}
