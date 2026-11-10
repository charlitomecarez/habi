import AsyncStorage from "@react-native-async-storage/async-storage";
import { describe, expect, it, vi } from "vitest";

import {
  addTiming,
  formatSeconds,
  median,
  parseTimings,
  requestKind,
  speedStatus,
  summarize,
  timedFetch,
  type Timing,
} from "@/lib/speed";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => {}), removeItem: vi.fn(async () => {}) },
}));

describe("median", () => {
  it("is null with no times", () => {
    expect(median([])).toBeNull();
  });

  it("takes the middle of an odd list", () => {
    expect(median([900, 100, 200])).toBe(200);
  });

  it("takes the mean of the two middle times of an even list", () => {
    expect(median([100, 400, 200, 300])).toBe(250);
  });
});

describe("speedStatus", () => {
  it("is Fast under 0.3 s", () => {
    expect(speedStatus(299)).toEqual({ label: "Fast", tone: "good" });
  });

  it("is Slow from 0.3 s to 1 s", () => {
    expect(speedStatus(300).label).toBe("Slow");
    expect(speedStatus(1000)).toEqual({ label: "Slow", tone: "watch" });
  });

  it("is Very slow over 1 s", () => {
    expect(speedStatus(1001)).toEqual({ label: "Very slow", tone: "over" });
  });
});

describe("formatSeconds", () => {
  it("shows two decimals", () => {
    expect(formatSeconds(210)).toBe("0.21 s");
    expect(formatSeconds(12_340)).toBe("12.3 s");
  });
});

describe("requestKind", () => {
  it("names functions, auth and data", () => {
    expect(requestKind("https://x.supabase.co/functions/v1/daily-ulam")).toBe("task");
    expect(requestKind("https://x.supabase.co/auth/v1/token?grant_type=refresh_token")).toBe("auth");
    expect(requestKind("https://x.supabase.co/rest/v1/todos?select=*")).toBe("data");
    expect(requestKind("https://x.supabase.co/storage/v1/object/sign/user-files/a.webp")).toBe("data");
  });

  it("reads only the path", () => {
    expect(requestKind("https://x.supabase.co/rest/v1/notes?q=/functions/v1/")).toBe("data");
  });
});

describe("addTiming", () => {
  it("keeps the newest times", () => {
    const list: Timing[] = [1, 2, 3].map((at) => ({ at, kind: "data", ms: at }));
    expect(addTiming(list, { at: 4, kind: "data", ms: 4 }, 3).map((t) => t.at)).toEqual([2, 3, 4]);
  });
});

describe("summarize", () => {
  it("is null with no times", () => {
    expect(summarize([])).toBeNull();
  });

  it("gives the median, the slowest, the count and the first time", () => {
    const list: Timing[] = [
      { at: 10, kind: "data", ms: 200 },
      { at: 20, kind: "task", ms: 880 },
      { at: 30, kind: "auth", ms: 150 },
    ];
    expect(summarize(list)).toEqual({ median: 200, slowest: list[1], count: 3, since: 10 });
  });
});

describe("parseTimings", () => {
  it("drops bad rows and bad JSON", () => {
    expect(parseTimings("not json")).toEqual([]);
    expect(parseTimings(null)).toEqual([]);
    expect(
      parseTimings(JSON.stringify([{ at: 1, kind: "data", ms: 5 }, { at: "x" }, { at: 2, kind: "x", ms: 1 }])),
    ).toEqual([{ at: 1, kind: "data", ms: 5 }]);
  });
});

describe("timedFetch", () => {
  it("returns the response and keeps no URL", async () => {
    const response = new Response("ok");
    const base = vi.fn(async () => response);
    let t = 1000;
    vi.useFakeTimers();
    const fetcher = timedFetch(base as unknown as typeof fetch, () => (t += 120));
    await expect(fetcher("https://x.supabase.co/rest/v1/todos?select=secret")).resolves.toBe(response);
    expect(base).toHaveBeenCalledOnce();
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    const saved = vi.mocked(AsyncStorage.setItem).mock.lastCall?.[1] ?? "";
    expect(JSON.parse(saved)).toEqual([{ at: 1240, kind: "data", ms: 120 }]);
    expect(saved).not.toContain("todos");
  });

  it("lets a network error through", async () => {
    const fetcher = timedFetch((async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch);
    await expect(fetcher("https://x.supabase.co/rest/v1/todos")).rejects.toThrow("Network request failed");
  });
});
