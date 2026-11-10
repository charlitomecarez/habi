import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

/**
 * The Speed check: how long each Supabase request takes on this device. Only the time, the kind
 * and the duration stay, never a URL, a body or a row. The last 50 live in AsyncStorage. No
 * `.web.ts` split: the web has fetch and AsyncStorage too.
 */

export type RequestKind = "data" | "task" | "auth";
export type Timing = { at: number; kind: RequestKind; ms: number };
export type SpeedStatus = { label: "Fast" | "Slow" | "Very slow"; tone: "good" | "watch" | "over" };

export const MAX_TIMINGS = 50;
const STORAGE_KEY = "speed-check:v1";
const SAVE_DELAY_MS = 2000;

const KIND_LABEL: Record<RequestKind, string> = { data: "Data", task: "Server task", auth: "Sign-in" };

/** Edge Functions are server tasks, Auth is sign-in, and the rest (rows, storage) is data. */
export function requestKind(url: string): RequestKind {
  const path = url.split("?")[0];
  if (path.includes("/functions/v1/")) return "task";
  if (path.includes("/auth/v1/")) return "auth";
  return "data";
}

export function kindLabel(kind: RequestKind): string {
  return KIND_LABEL[kind];
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Under 0.3 s is Fast, 0.3 to 1 s is Slow, over 1 s is Very slow. */
export function speedStatus(ms: number): SpeedStatus {
  if (ms < 300) return { label: "Fast", tone: "good" };
  if (ms <= 1000) return { label: "Slow", tone: "watch" };
  return { label: "Very slow", tone: "over" };
}

/** "0.21 s". Two decimals under 10 s, one after. */
export function formatSeconds(ms: number): string {
  const s = ms / 1000;
  return `${s < 10 ? s.toFixed(2) : s.toFixed(1)} s`;
}

/** Keeps the newest `max`, oldest first. */
export function addTiming(list: Timing[], timing: Timing, max = MAX_TIMINGS): Timing[] {
  const next = [...list, timing];
  return next.length > max ? next.slice(next.length - max) : next;
}

export type SpeedSummary = { median: number; slowest: Timing; count: number; since: number };

export function summarize(list: Timing[]): SpeedSummary | null {
  const mid = median(list.map((t) => t.ms));
  if (mid === null) return null;
  const slowest = list.reduce((a, b) => (b.ms > a.ms ? b : a));
  return { median: mid, slowest, count: list.length, since: list[0].at };
}

function isTiming(value: unknown): value is Timing {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.at === "number" &&
    typeof t.ms === "number" &&
    (t.kind === "data" || t.kind === "task" || t.kind === "auth")
  );
}

export function parseTimings(raw: string | null): Timing[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isTiming).slice(-MAX_TIMINGS) : [];
  } catch {
    return [];
  }
}

// The store: memory first, saved a moment later so a burst of requests writes once.
let timings: Timing[] = [];
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timings)).catch(() => {});
  }, SAVE_DELAY_MS);
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = parseTimings(await AsyncStorage.getItem(STORAGE_KEY));
    // Requests timed before the load finished come after the saved ones.
    timings = [...saved, ...timings].slice(-MAX_TIMINGS);
    emit();
  } catch {
    // No saved times; start empty.
  }
}

export function recordTiming(timing: Timing) {
  timings = addTiming(timings, timing);
  emit();
  scheduleSave();
}

export function clearTimings() {
  timings = [];
  emit();
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void load();
  return () => {
    listeners.delete(listener);
  };
}

export function useTimings(): Timing[] {
  return useSyncExternalStore(
    subscribe,
    () => timings,
    () => timings,
  );
}

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Wraps fetch so each request that gets a response is timed. A failed request is not timed. */
export function timedFetch(base: typeof fetch = fetch, now: () => number = Date.now): typeof fetch {
  return async (input, init) => {
    const kind = requestKind(urlOf(input));
    const start = now();
    const response = await base(input, init);
    const end = now();
    recordTiming({ at: end, kind, ms: Math.max(end - start, 0) });
    return response;
  };
}
