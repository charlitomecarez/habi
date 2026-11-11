import { beforeEach, describe, expect, it, vi } from "vitest";

import { readFullStory, siteName, useLatestNews, useNews, useStory } from "@/lib/news";
import { runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
const browser = vi.hoisted(() => ({ openBrowserAsync: vi.fn(async () => ({})) }));
vi.mock("expo-web-browser", () => browser);

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("news data", () => {
  it("reads both sections and the newest good sync", async () => {
    respond(
      { data: [{ id: "a" }] },
      { data: [{ id: "b" }] },
      {
        data: [
          { feed: "x", last_ok_at: "2026-11-11T01:00:00Z", last_error_at: null },
          { feed: "y", last_ok_at: null, last_error_at: null },
        ],
      },
    );
    const news = (await runQuery(useNews())) as { ph: unknown[]; lastSync: string | null };
    expect(news.ph).toEqual([{ id: "a" }]);
    expect(news.lastSync).toBe("2026-11-11T01:00:00Z");
    for (const order of [
      [{ error: new Error("a") }, {}, {}],
      [{}, { error: new Error("a") }, {}],
      [{}, {}, { error: new Error("a") }],
    ]) {
      respond(...order);
      await expect(runQuery(useNews())).rejects.toThrow("a");
    }
  });

  it("reads the latest headlines and one story", async () => {
    respond({ data: [{ id: "a" }] }, { data: { id: "s" } });
    expect(await runQuery(useLatestNews(5))).toEqual([{ id: "a" }]);
    expect(await runQuery(useStory("s"))).toEqual({ id: "s" });
    expect(argsOf("limit")).toEqual([[5]]);
    for (const hook of [useLatestNews(), useStory("s")]) {
      respond({ error: new Error("down") });
      await expect(runQuery(hook)).rejects.toThrow("down");
    }
  });

  it("names the site and opens the full story", async () => {
    expect(siteName("https://www.inquirer.net/x")).toBe("inquirer.net");
    expect(siteName("not a url")).toBe("the outlet's site");
    await readFullStory({ url: "https://inquirer.net/x" });
    expect(browser.openBrowserAsync).toHaveBeenCalledWith("https://inquirer.net/x", {
      showTitle: true,
      enableBarCollapsing: true,
    });
  });
});
