import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runMutation, runQuery } from "@/lib/test/fake-query";
import { store } from "@/lib/test/fake-storage";
import {
  DEFAULT_WORLD,
  readWorldPlaces,
  searchPlaces,
  useSavePlace,
  useSaveWorldPlaces,
  useWeather,
  useWorldWeather,
  weatherWord,
  type Place,
} from "@/lib/weather";

vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
vi.mock("@react-native-async-storage/async-storage", () => import("@/lib/test/fake-storage"));

const manila: Place = { name: "Manila", region: "Metro Manila", latitude: 14.6, longitude: 121 };
const reply = {
  current: { time: "2026-11-11T10:00", temperature_2m: 31, weather_code: 1, is_day: 1 },
  hourly: { time: [], temperature_2m: [], weather_code: [], is_day: [] },
  daily: {
    time: [],
    weather_code: [],
    temperature_2m_max: [],
    temperature_2m_min: [],
    precipitation_probability_max: [],
  },
};
const ok = (body: unknown) => ({ ok: true, json: async () => body });
const fetchMock = vi.fn();

beforeEach(() => {
  store.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("weather words", () => {
  it("names every code group", () => {
    expect([0, 2, 3, 45, 51, 61, 71, 80, 95, 90].map(weatherWord)).toEqual([
      "Clear",
      "Partly cloudy",
      "Cloudy",
      "Fog",
      "Drizzle",
      "Rain",
      "Snow",
      "Rain showers",
      "Thunderstorm",
      "Cloudy",
    ]);
  });
});

describe("place search", () => {
  it("searches the Philippines, or the world with a region", async () => {
    fetchMock.mockResolvedValueOnce(ok({ results: [{ name: "Baguio", latitude: 16.4, longitude: 120.6 }] }));
    expect(await searchPlaces("Baguio")).toEqual([
      { name: "Baguio", region: "Philippines", latitude: 16.4, longitude: 120.6 },
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("countryCode=PH");
    fetchMock.mockResolvedValueOnce(ok({}));
    expect(await searchPlaces("Nowhere", { world: true })).toEqual([]);
    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(searchPlaces("x")).rejects.toThrow("Could not search.");
  });
});

describe("saved place forecast", () => {
  it("has no forecast before a place is saved", async () => {
    expect(await runQuery(useWeather())).toEqual({ place: null, forecast: null, stale: false });
  });

  it("fetches, saves, and then reuses a fresh forecast", async () => {
    await runMutation(useSavePlace(), manila);
    fetchMock.mockResolvedValueOnce(ok(reply));
    const first = (await runQuery(useWeather())) as { forecast: unknown; stale: boolean };
    expect(first.stale).toBe(false);
    expect(store.has("weather-forecast")).toBe(true);
    await runQuery(useWeather());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps an old forecast when an update fails, and throws with none", async () => {
    store.set("weather-place", JSON.stringify(manila));
    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(runQuery(useWeather())).rejects.toThrow("Could not update.");
    store.set("weather-forecast", JSON.stringify({ fetchedAt: 0 }));
    fetchMock.mockResolvedValueOnce({ ok: false });
    expect(await runQuery(useWeather())).toMatchObject({ stale: true });
  });
});

describe("world weather", () => {
  it("starts with the default places, and none after you remove them all", async () => {
    expect(await readWorldPlaces()).toEqual(DEFAULT_WORLD);
    await runMutation(useSaveWorldPlaces(), []);
    expect(await runQuery(useWorldWeather())).toEqual({ places: [], forecast: null, stale: false });
  });

  it("fetches, reuses, and keeps the last forecast on a failure", async () => {
    await runMutation(useSaveWorldPlaces(), [manila]);
    fetchMock.mockResolvedValueOnce(ok({ ...reply, utc_offset_seconds: 28800 }));
    expect(await runQuery(useWorldWeather())).toMatchObject({ stale: false });
    await runQuery(useWorldWeather());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(store.get("weather-world-forecast")!);
    store.set("weather-world-forecast", JSON.stringify({ ...saved, fetchedAt: 0 }));
    fetchMock.mockResolvedValueOnce({ ok: false });
    expect(await runQuery(useWorldWeather())).toMatchObject({ stale: true });
    store.delete("weather-world-forecast");
    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(runQuery(useWorldWeather())).rejects.toThrow("Could not update.");
  });
});
