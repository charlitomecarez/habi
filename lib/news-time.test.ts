import { describe, expect, it } from "vitest";

import { downFeeds, timeAgo } from "@/lib/news-time";

const now = new Date(2026, 10, 8, 14, 20);

describe("timeAgo", () => {
  it("says minutes, then hours, then the day", () => {
    expect(timeAgo(new Date(2026, 10, 8, 14, 20, 30), now)).toBe("Just now");
    expect(timeAgo(new Date(2026, 10, 8, 13, 55), now)).toBe("25 min ago");
    expect(timeAgo(new Date(2026, 10, 8, 11, 5), now)).toBe("3 h ago");
    expect(timeAgo(new Date(2026, 10, 7, 21, 10), now)).toBe("Yesterday, 9:10 PM");
    expect(timeAgo(new Date(2026, 10, 6, 21, 10), now)).toBe("Nov 6, 9:10 PM");
  });
});

describe("downFeeds", () => {
  it("lists a feed whose last run failed after its last good run", () => {
    const sync = [
      { source: "Up", last_ok_at: "2026-11-08T06:20:00Z", last_error_at: "2026-11-08T04:20:00Z" },
      { source: "Down", last_ok_at: "2026-11-08T04:20:00Z", last_error_at: "2026-11-08T06:20:00Z" },
      { source: "Never", last_ok_at: null, last_error_at: "2026-11-08T06:20:00Z" },
      { source: "New", last_ok_at: null, last_error_at: null },
    ];
    expect(downFeeds(sync)).toEqual([
      { source: "Down", lastOk: "2026-11-08T04:20:00Z" },
      { source: "Never", lastOk: null },
    ]);
  });
});
