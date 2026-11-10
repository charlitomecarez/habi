import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

const { clearHomeSummary, fromHomeSummary, homeParams, isFresh, slice, startHomeSummary, SUMMARY_WINDOW_MS } =
  await import("@/lib/home-summary");

beforeEach(() => {
  rpc.mockReset();
  clearHomeSummary();
});

describe("homeParams", () => {
  it("uses the phone's own month and today", () => {
    const p = homeParams(new Date(2026, 10, 10, 18, 12));
    expect(p.p_today).toBe("2026-11-10");
    expect(p.p_month_start).toBe("2026-11-01");
    expect(p.p_month_end).toBe("2026-12-01");
    expect(p.p_ulam_from).toBe("2026-11-04");
  });
});

describe("isFresh", () => {
  it("lasts while loading, then for the window after it arrives", () => {
    expect(isFresh({ startedAt: 0, settledAt: null }, 1_000)).toBe(true);
    expect(isFresh({ startedAt: 0, settledAt: 1_000 }, 1_000 + SUMMARY_WINDOW_MS - 1)).toBe(true);
    expect(isFresh({ startedAt: 0, settledAt: 1_000 }, 1_000 + SUMMARY_WINDOW_MS)).toBe(false);
  });
});

describe("fromHomeSummary", () => {
  it("reads the module's rows from one summary request", async () => {
    rpc.mockResolvedValue({ data: { todos: [{ id: "t1" }], vehicle: null }, error: null });
    startHomeSummary();
    const fallback = vi.fn();
    await expect(fromHomeSummary((s) => slice(s, "todos"), fallback)).resolves.toEqual([{ id: "t1" }]);
    // Null is a real answer: no vehicle yet.
    await expect(fromHomeSummary((s) => slice(s, "vehicle"), fallback)).resolves.toBeNull();
    expect(fallback).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("starts no second request while one is fresh, unless forced", () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    startHomeSummary();
    startHomeSummary();
    expect(rpc).toHaveBeenCalledOnce();
    startHomeSummary(new Date(), true);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("asks the server alone with no summary, a failed one, or a key it lacks", async () => {
    const fallback = vi.fn(async () => ["own"]);
    await expect(fromHomeSummary((s) => slice(s, "todos"), fallback)).resolves.toEqual(["own"]);

    rpc.mockResolvedValue({ data: null, error: new Error("down") });
    startHomeSummary();
    await expect(fromHomeSummary((s) => slice(s, "todos"), fallback)).resolves.toEqual(["own"]);

    rpc.mockResolvedValue({ data: { other: [] }, error: null });
    startHomeSummary(new Date(), true);
    await expect(fromHomeSummary((s) => slice(s, "todos"), fallback)).resolves.toEqual(["own"]);
    expect(fallback).toHaveBeenCalledTimes(3);
  });

  it("drops the summary on sign out", async () => {
    rpc.mockResolvedValue({ data: { todos: [{ id: "a" }] }, error: null });
    startHomeSummary();
    clearHomeSummary();
    const fallback = vi.fn(async () => []);
    await fromHomeSummary((s) => slice(s, "todos"), fallback);
    expect(fallback).toHaveBeenCalledOnce();
  });
});
