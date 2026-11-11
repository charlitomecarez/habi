import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAddVideoTask, useDeleteVideo, useSaveVideo, useVideo, useVideos, useVideoTasks } from "@/lib/content";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("content data", () => {
  it("reads videos with their posts, and a video's tasks", async () => {
    respond(
      {
        data: [
          { id: "v1", posts: [{ platform: "tiktok" }] },
          { id: "v2", posts: null },
        ],
      },
      { data: [{ id: "t" }] },
    );
    expect(await runQuery(useVideos())).toEqual([
      { id: "v1", posts: [{ platform: "tiktok" }] },
      { id: "v2", posts: [] },
    ]);
    expect(await runQuery(useVideoTasks("v1"))).toEqual([{ id: "t" }]);
    expect(useVideo("v1").data).toBeUndefined();
    for (const hook of [useVideos(), useVideoTasks("v1")]) {
      respond({ error: new Error("down") });
      await expect(runQuery(hook)).rejects.toThrow("down");
    }
  });

  it("adds a video as Untitled when it has no title", async () => {
    respond({ data: { id: "v9" } });
    expect(await runMutation(useSaveVideo(), { input: { posts: [] } })).toBe("v9");
    expect(argsOf("insert")[0][0]).toEqual({ posts: [], title: "Untitled" });
    await expectWriteErrors([[useSaveVideo(), { input: { title: "x" } }]]);
  });

  it("edits a video before the server answers, and rolls back on an error", async () => {
    const previous = [
      { id: "v1", stage: "idea" },
      { id: "v2", stage: "idea" },
    ];
    queryClient.getQueryData.mockReturnValue(previous);
    expect(await runMutation(useSaveVideo(), { id: "v1", input: { stage: "edit" } })).toBe("v1");
    const update = queryClient.setQueryData.mock.calls[0][1] as (v: typeof previous) => typeof previous;
    expect(update(previous)[0].stage).toBe("edit");
    respond({ error: new Error("down") });
    await expect(runMutation(useSaveVideo(), { id: "v1", input: { title: "y" } })).rejects.toThrow("down");
    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(["content", "videos"], previous);
    queryClient.getQueryData.mockReturnValue(undefined);
  });

  it("deletes a video and adds a task with a reminder", async () => {
    await runMutation(useDeleteVideo(), "v1");
    await runMutation(useAddVideoTask(), { videoId: "v1", title: "Edit", dueAt: new Date("2026-11-12T01:00:00Z") });
    await runMutation(useAddVideoTask(), { videoId: "v1", title: "Post", dueAt: null });
    expect(argsOf("insert")[0][0]).toEqual({
      title: "Edit",
      video_id: "v1",
      due_at: "2026-11-12T01:00:00.000Z",
      remind_at: "2026-11-12T01:00:00.000Z",
    });
    expect(argsOf("insert")[1][0]).toMatchObject({ due_at: null, remind_at: null });
    await expectWriteErrors([
      [useDeleteVideo(), "v"],
      [useAddVideoTask(), { videoId: "v", title: "x", dueAt: null }],
    ]);
  });
});
