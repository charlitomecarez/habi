import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useHealthDayRows,
  useHealthDaysSync,
  useHealthInsights,
  useTurnOffHealthCheck,
  useTurnOnHealthCheck,
} from "@/lib/health-check";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
vi.mock("react", () => ({ useEffect: (fn: () => void) => fn() }));
const state = vi.hoisted(() => ({
  on: true,
  save: vi.fn(async () => {}),
  sleep: { isSuccess: true, data: {} as Record<string, unknown> },
}));
vi.mock("@/lib/settings", () => ({
  useUserSettings: () => ({ data: { healthCheck: state.on } }),
  useSaveUserSettings: () => ({ mutateAsync: state.save }),
}));
vi.mock("@/lib/sleep", () => ({ useSleepLog: () => state.sleep, sleepMinutes: () => 420 }));
vi.mock("@/lib/steps", () => ({ useSteps: () => ({ isLoading: false, data: { week: [] } }) }));

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("health check data", () => {
  it("reads the last two days of advice", async () => {
    respond({ data: [{ id: "i1" }] });
    expect(await runQuery(useHealthInsights(true))).toEqual([{ id: "i1" }]);
    expect(argsOf("limit")).toEqual([[2]]);
    respond({ error: new Error("down") });
    await expect(runQuery(useHealthInsights(true))).rejects.toThrow("down");
  });

  it("turns the check off and forgets the advice", async () => {
    await runMutation(useTurnOffHealthCheck());
    expect(targets()).toEqual(["clear_health_check"]);
    expect(queryClient.removeQueries).toHaveBeenCalled();
    respond({ error: new Error("down") });
    await expect(runMutation(useTurnOffHealthCheck())).rejects.toThrow("down");
  });

  it("sends nothing while the check is off", async () => {
    state.on = false;
    useHealthDaysSync();
    await flush();
    expect(targets()).toEqual([]);
    state.on = true;
  });

  it("turns the check on, then sends the days once a day", async () => {
    state.sleep.data = { "2026-11-10": { bed: "23:00", wake: "06:00" } };
    const rows = useHealthDayRows();
    await runMutation(useTurnOnHealthCheck());
    expect(state.save).toHaveBeenCalledWith({ healthCheck: true });
    expect(targets()).toEqual(rows.length ? ["health_days"] : []);
    useHealthDaysSync();
    await flush();
    expect(targets()).toEqual(rows.length ? ["health_days"] : []);
  });

  it("tries again after a failed send", async () => {
    await runMutation(useTurnOffHealthCheck());
    respond({ error: new Error("offline") });
    useHealthDaysSync();
    await flush();
    useHealthDaysSync();
    await flush();
    expect(targets().filter((t) => t === "health_days").length).toBeGreaterThanOrEqual(1);
  });
});
