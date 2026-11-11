import { FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";
import {
  ageText,
  durationText,
  feedFailed,
  groupVideos,
  openVideo,
  thumbUrl,
  useAddChannel,
  useRemoveChannel,
  useRestoreChannel,
  useYouTube,
  type Video,
} from "@/lib/youtube";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
const linking = vi.hoisted(() => ({ openURL: vi.fn(async () => true) }));
vi.mock("react-native", () => ({ Linking: linking }));

const video = (video_id: string, published_at: string): Video => ({
  video_id,
  channel_id: "UC1",
  title: "A video",
  published_at,
  duration_s: null,
  updated_at: published_at,
});

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("video words", () => {
  it("builds the thumbnail and the length", () => {
    expect(thumbUrl("abc")).toBe("https://i.ytimg.com/vi/abc/mqdefault.jpg");
    expect(durationText(842)).toBe("14:02");
    expect(durationText(3750)).toBe("1:02:30");
    expect(durationText(null)).toBeNull();
  });

  it("says how old a video is", () => {
    const now = new Date(2026, 10, 25, 12, 0);
    expect(ageText(new Date(2026, 10, 25, 11, 50).toISOString(), now)).toBe("10 min ago");
    expect(ageText(new Date(2026, 10, 25, 9, 0).toISOString(), now)).toBe("3 h ago");
    expect(ageText(new Date(2026, 10, 24, 9, 0).toISOString(), now)).toBe("Yesterday");
    expect(ageText(new Date(2026, 10, 21, 9, 0).toISOString(), now)).toBe("4 days ago");
    expect(ageText(new Date(2026, 9, 2, 9, 0).toISOString(), now)).toBe("Oct 2");
  });

  it("groups by Today, Yesterday and the date", () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    const older = new Date(2026, 0, 5, 12);
    const groups = groupVideos([
      video("a", today.toISOString()),
      video("b", yesterday.toISOString()),
      video("c", older.toISOString()),
    ]);
    expect(groups.map((g) => g.title)).toEqual(["Today", "Yesterday", "Monday, Jan 5"]);
  });

  it("knows a failed feed", () => {
    expect(feedFailed({ last_ok_at: "2026-11-24", last_error_at: "2026-11-25" })).toBe(true);
    expect(feedFailed({ last_ok_at: "2026-11-25", last_error_at: "2026-11-24" })).toBe(false);
    expect(feedFailed({ last_ok_at: null, last_error_at: "2026-11-24" })).toBe(true);
    expect(feedFailed(undefined)).toBe(false);
  });

  it("opens a video", async () => {
    await openVideo("abc");
    expect(linking.openURL).toHaveBeenCalledWith("https://www.youtube.com/watch?v=abc");
  });
});

describe("youtube data", () => {
  it("reads channels, videos and feeds", async () => {
    respond({ data: [{ id: "c1" }] }, { data: [] }, { data: [] });
    expect(await runQuery(useYouTube())).toEqual({ channels: [{ id: "c1" }], videos: [], feeds: [] });
    expect(targets()).toEqual(["youtube_channels", "youtube_videos", "youtube_feeds"]);
    for (let failing = 0; failing < 3; failing++) {
      respond(...[0, 1, 2].map((i) => (i === failing ? { error: new Error("down") } : {})));
      await expect(runQuery(useYouTube())).rejects.toThrow("down");
    }
  });

  it("adds a channel through the server, with its sentence on an error", async () => {
    respond({ data: { channel_id: "UC1", title: "Kusina Lab" } });
    expect(await runMutation(useAddChannel(), "@kusinalab")).toEqual({ channel_id: "UC1", title: "Kusina Lab" });
    expect(argsOf("invoke")[0]).toEqual(["youtube-channel", { body: { input: "@kusinalab" } }]);
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    respond({
      error: new FunctionsHttpError(new Response(JSON.stringify({ error: "This is a video link." }), { status: 422 })),
    });
    await expect(runMutation(useAddChannel(), "x")).rejects.toThrow("This is a video link.");
    respond({ error: new Error("offline") });
    await expect(runMutation(useAddChannel(), "x")).rejects.toThrow("Check your connection");
  });

  it("removes a channel and puts it back", async () => {
    await runMutation(useRemoveChannel(), "c1");
    await runMutation(useRestoreChannel(), { channel_id: "UC1", title: "Kusina Lab" });
    expect(argsOf("insert")[0][0]).toEqual({ channel_id: "UC1", title: "Kusina Lab" });
    await expectWriteErrors([
      [useRemoveChannel(), "c1"],
      [useRestoreChannel(), { channel_id: "UC1", title: "x" }],
    ]);
  });
});
