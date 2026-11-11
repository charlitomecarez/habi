import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearSleepLog, useSaveSleep, useSleepFromPhone, useSleepLog } from "@/lib/sleep";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { store } from "@/lib/test/fake-storage";

vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
vi.mock("@react-native-async-storage/async-storage", () => import("@/lib/test/fake-storage"));
vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
const effects = vi.hoisted(() => ({ cleanup: [] as (() => void)[] }));
vi.mock("react", () => ({
  useEffect: (fn: () => (() => void) | void) => {
    const cleanup = fn();
    if (cleanup) effects.cleanup.push(cleanup);
  },
}));
const appState = vi.hoisted(() => ({ listener: null as ((s: string) => void) | null, remove: vi.fn() }));
vi.mock("react-native", () => ({
  AppState: {
    addEventListener: (_e: string, fn: (s: string) => void) => {
      appState.listener = fn;
      return { remove: appState.remove };
    },
  },
}));
const phone = vi.hoisted(() => ({
  readNightSleep: vi.fn(async () => null as unknown),
  readScreenEvents: vi.fn(async () => null as unknown),
  findSleep: vi.fn(() => null as unknown),
}));
vi.mock("@/lib/health-connect", () => ({ readNightSleep: phone.readNightSleep }));
vi.mock("@/lib/screen-time", () => ({ readScreenEvents: phone.readScreenEvents }));
vi.mock("@/lib/sleep-detect", () => ({
  findSleep: phone.findSleep,
  nightWindow: () => ({ start: 0, end: Number.MAX_SAFE_INTEGER }),
}));

const KEY = "sleep-log";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const span = () => {
  const d = new Date();
  return {
    start: new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 23, 0),
    end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 30),
  };
};
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  effects.cleanup.length = 0;
});

describe("sleep log", () => {
  it("reads an empty log, saves a typed night and clears it", async () => {
    expect(await runQuery(useSleepLog())).toEqual({});
    await runMutation(useSaveSleep(), { day: new Date(2026, 10, 11), entry: { bed: "23:00", wake: "06:00" } });
    expect(await runQuery(useSleepLog())).toEqual({ "2026-11-11": { bed: "23:00", wake: "06:00", source: "typed" } });
    await clearSleepLog();
    expect(store.size).toBe(0);
  });
});

describe("sleep from the phone", () => {
  it("saves a Health Connect night and tells the screen", async () => {
    phone.readNightSleep.mockResolvedValueOnce(span());
    const onSaved = vi.fn();
    useSleepFromPhone(onSaved);
    await flush();
    expect(JSON.parse(store.get(KEY)!)[today()]).toEqual({ bed: "23:00", wake: "06:30", source: "health_connect" });
    expect(onSaved).toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    effects.cleanup[0]();
    expect(appState.remove).toHaveBeenCalled();
  });

  it("uses the screen when Health Connect has no night, and checks again on return", async () => {
    phone.readScreenEvents.mockResolvedValue([{}]);
    phone.findSleep.mockReturnValue(span());
    useSleepFromPhone();
    await flush();
    expect(JSON.parse(store.get(KEY)!)[today()].source).toBe("screen");
    appState.listener?.("background");
    appState.listener?.("active");
    await flush();
    expect(phone.readScreenEvents).toHaveBeenCalledTimes(2);
    phone.readScreenEvents.mockResolvedValue(null);
    phone.findSleep.mockReturnValue(null);
  });

  it("keeps a typed night and a Health Connect night", async () => {
    store.set(KEY, JSON.stringify({ [today()]: { bed: "22:00", wake: "05:00", source: "typed" } }));
    useSleepFromPhone();
    await flush();
    expect(phone.readNightSleep).not.toHaveBeenCalled();
    store.set(KEY, JSON.stringify({ [today()]: { bed: "22:00", wake: "05:00", source: "health_connect" } }));
    useSleepFromPhone();
    await flush();
    expect(phone.readScreenEvents).not.toHaveBeenCalled();
  });

  it("writes nothing when the night did not change, or when the reading fails", async () => {
    store.set(KEY, JSON.stringify({ [today()]: { bed: "23:00", wake: "06:30", source: "screen" } }));
    phone.readNightSleep.mockResolvedValueOnce(span());
    const onSaved = vi.fn();
    useSleepFromPhone(onSaved);
    await flush();
    phone.readNightSleep.mockRejectedValueOnce(new Error("no permission"));
    phone.readScreenEvents.mockRejectedValueOnce(new Error("no access"));
    useSleepFromPhone(onSaved);
    await flush();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
