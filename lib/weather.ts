import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// The app calls Open-Meteo directly, because weather is a public fact. It needs no key.
// The saved place and the last forecast stay on this phone.

const PLACE_KEY = "weather-place";
const FORECAST_KEY = "weather-forecast";
const FRESH_MS = 30 * 60 * 1000;
const HOURS = ["10:00", "13:00", "16:00", "19:00"];

export type Place = { name: string; region: string; latitude: number; longitude: number };

export type Forecast = {
  fetchedAt: number;
  temperature: number;
  word: string;
  /** Empty on a forecast that was saved before the app kept the code. */
  code?: number;
  isDay?: boolean;
  rain: number;
  high: number;
  low: number;
  hours: { time: string; temperature: number; code?: number; isDay?: boolean }[];
  days: { date: string; rain: number; high: number; low: number; code?: number }[];
};

export type WeatherIcon =
  "sunny" | "moon" | "partly-sunny" | "cloudy-night" | "cloudy" | "cloud-outline" | "rainy" | "snow" | "thunderstorm";

/** The drawn icon for a WMO code. Clear and partly cloudy nights show the moon. */
export function weatherIcon(code: number | undefined, isDay = true): WeatherIcon | null {
  if (code === undefined) return null;
  if (code === 0) return isDay ? "sunny" : "moon";
  if (code <= 2) return isDay ? "partly-sunny" : "cloudy-night";
  if (code === 3) return "cloudy";
  if (code <= 48) return "cloud-outline";
  if (code >= 95) return "thunderstorm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code <= 82) return "rainy";
  return "cloudy";
}

/** The WMO weather codes that Open-Meteo sends, in words. */
export function weatherWord(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code <= 67) return "Rain";
  if (code <= 82) return "Rain showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

type ForecastReply = {
  current: { temperature_2m: number; weather_code: number; is_day?: number };
  hourly: { time: string[]; temperature_2m: number[]; weather_code?: number[]; is_day?: number[] };
  daily: {
    time: string[];
    weather_code?: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

export function parseForecast(reply: ForecastReply, now: number): Forecast {
  const { current, hourly, daily } = reply;
  const today = daily.time[0];
  return {
    fetchedAt: now,
    temperature: Math.round(current.temperature_2m),
    word: weatherWord(current.weather_code),
    code: current.weather_code,
    isDay: current.is_day !== 0,
    rain: daily.precipitation_probability_max[0] ?? 0,
    high: Math.round(daily.temperature_2m_max[0]),
    low: Math.round(daily.temperature_2m_min[0]),
    hours: HOURS.flatMap((time) => {
      const index = hourly.time.indexOf(`${today}T${time}`);
      return index === -1
        ? []
        : [
            {
              time,
              temperature: Math.round(hourly.temperature_2m[index]),
              code: hourly.weather_code?.[index],
              isDay: hourly.is_day?.[index] !== 0,
            },
          ];
    }),
    days: daily.time.slice(1, 4).map((date, i) => ({
      date,
      rain: daily.precipitation_probability_max[i + 1] ?? 0,
      high: Math.round(daily.temperature_2m_max[i + 1]),
      low: Math.round(daily.temperature_2m_min[i + 1]),
      code: daily.weather_code?.[i + 1],
    })),
  };
}

async function fetchForecast(place: Place): Promise<Forecast> {
  const query = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,weather_code,is_day",
    hourly: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Asia/Manila",
    forecast_days: "4",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
  if (!res.ok) throw new Error("Could not update.");
  return parseForecast((await res.json()) as ForecastReply, Date.now());
}

async function read<T>(key: string): Promise<T | null> {
  const text = await AsyncStorage.getItem(key).catch(() => null);
  return text ? (JSON.parse(text) as T) : null;
}

type GeoResult = { name: string; admin1?: string; country?: string; latitude: number; longitude: number };

/** "California, United States"; a city-state such as Hong Kong is just its name. */
export function worldRegion(r: Pick<GeoResult, "name" | "admin1" | "country">): string {
  const parts = [r.admin1, r.country].filter((p): p is string => !!p && p !== r.name);
  return [...new Set(parts)].join(", ") || r.name;
}

/** Places in the Philippines, or anywhere with `world`. */
export async function searchPlaces(name: string, { world = false } = {}): Promise<Place[]> {
  const query = new URLSearchParams({ name, count: "8", language: "en" });
  if (!world) query.set("countryCode", "PH");
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${query}`);
  if (!res.ok) throw new Error("Could not search.");
  const json = (await res.json()) as { results?: GeoResult[] };
  return (json.results ?? []).map((r) => ({
    name: r.name,
    region: world ? worldRegion(r) : (r.admin1 ?? "Philippines"),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

const WEATHER_KEY = ["weather"] as const;

/** The saved place and its forecast. A failed update keeps the last forecast, and says so. */
export function useWeather() {
  return useQuery({
    queryKey: WEATHER_KEY,
    staleTime: FRESH_MS,
    queryFn: async () => {
      const place = await read<Place>(PLACE_KEY);
      if (!place) return { place: null, forecast: null, stale: false };
      const saved = await read<Forecast>(FORECAST_KEY);
      if (saved && Date.now() - saved.fetchedAt < FRESH_MS) return { place, forecast: saved, stale: false };
      try {
        const forecast = await fetchForecast(place);
        await AsyncStorage.setItem(FORECAST_KEY, JSON.stringify(forecast));
        return { place, forecast, stale: false };
      } catch (error) {
        if (saved) return { place, forecast: saved, stale: true };
        throw error;
      }
    },
  });
}

export function useSavePlace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (place: Place) => {
      await AsyncStorage.setItem(PLACE_KEY, JSON.stringify(place));
      await AsyncStorage.removeItem(FORECAST_KEY);
    },
    onSettled: () => client.invalidateQueries({ queryKey: WEATHER_KEY }),
  });
}

// World weather: up to 6 places, in one Open-Meteo call. The places and the last forecast stay on
// this phone, like your own place.

const WORLD_PLACES_KEY = "weather-world-places";
const WORLD_FORECAST_KEY = "weather-world-forecast";
export const MAX_WORLD = 6;

export const DEFAULT_WORLD: Place[] = [
  { name: "Hong Kong", region: "Hong Kong", latitude: 22.2783, longitude: 114.1747 },
  { name: "Tokyo", region: "Japan", latitude: 35.6895, longitude: 139.6917 },
  { name: "Rome", region: "Italy", latitude: 41.8919, longitude: 12.5113 },
  { name: "Los Angeles", region: "California, United States", latitude: 34.0522, longitude: -118.2437 },
  { name: "New York", region: "New York, United States", latitude: 40.7143, longitude: -74.006 },
];

export type WorldItem = {
  place: Place;
  temperature: number;
  word: string;
  code: number;
  isDay: boolean;
  high: number;
  low: number;
  /** The place's offset from UTC when the forecast was fetched. */
  utcOffsetSeconds: number;
};

export type WorldForecast = { fetchedAt: number; places: string; items: WorldItem[] };

export const placeKey = (p: Place) => `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}`;
const placesKey = (places: Place[]) => places.map(placeKey).join(";");

/** One request for every place. `timezone=auto` gives each place its own day and offset. */
export function worldUrl(places: Place[]): string {
  const query = new URLSearchParams({
    latitude: places.map((p) => p.latitude).join(","),
    longitude: places.map((p) => p.longitude).join(","),
    current: "temperature_2m,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "1",
  });
  return `https://api.open-meteo.com/v1/forecast?${query}`;
}

type WorldReply = {
  utc_offset_seconds: number;
  current: { temperature_2m: number; weather_code: number; is_day?: number };
  daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
};

/** Open-Meteo answers one place with an object and several with a list. */
export function parseWorld(reply: WorldReply | WorldReply[], places: Place[], now: number): WorldForecast {
  const list = Array.isArray(reply) ? reply : [reply];
  return {
    fetchedAt: now,
    places: placesKey(places),
    items: places.map((place, i) => {
      const r = list[i];
      return {
        place,
        temperature: Math.round(r.current.temperature_2m),
        word: weatherWord(r.current.weather_code),
        code: r.current.weather_code,
        isDay: r.current.is_day !== 0,
        high: Math.round(r.daily.temperature_2m_max[0]),
        low: Math.round(r.daily.temperature_2m_min[0]),
        utcOffsetSeconds: r.utc_offset_seconds,
      };
    }),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date, utc: boolean) =>
  utc
    ? `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * The place's clock now, such as "6:12 PM", and "Yesterday" or "Tomorrow" when its date is not
 * yours. A daylight-saving change since the fetch can shift it by an hour until the next update.
 */
export function localTime(
  now: number,
  utcOffsetSeconds: number,
): { time: string; day: "Yesterday" | "Tomorrow" | null } {
  const there = new Date(now + utcOffsetSeconds * 1000);
  const hours = there.getUTCHours();
  const time = `${hours % 12 || 12}:${pad(there.getUTCMinutes())} ${hours < 12 ? "AM" : "PM"}`;
  const theirs = ymd(there, true);
  const mine = ymd(new Date(now), false);
  return { time, day: theirs === mine ? null : theirs < mine ? "Yesterday" : "Tomorrow" };
}

/** Adds a place at the end. A place already in the list, or a seventh place, changes nothing. */
export function addWorldPlace(places: Place[], place: Place): Place[] {
  if (places.length >= MAX_WORLD || places.some((p) => placeKey(p) === placeKey(place))) return places;
  return [...places, place];
}

export async function readWorldPlaces(): Promise<Place[]> {
  return (await read<Place[]>(WORLD_PLACES_KEY)) ?? DEFAULT_WORLD;
}

const WORLD_KEY = ["weather-world"] as const;

/** The world places and their weather. A failed update keeps the last forecast, and says so. */
export function useWorldWeather() {
  return useQuery({
    queryKey: WORLD_KEY,
    staleTime: FRESH_MS,
    queryFn: async () => {
      const places = await readWorldPlaces();
      if (places.length === 0) return { places, forecast: null, stale: false };
      const saved = await read<WorldForecast>(WORLD_FORECAST_KEY);
      const same = saved?.places === placesKey(places) ? saved : null;
      if (same && Date.now() - same.fetchedAt < FRESH_MS) return { places, forecast: same, stale: false };
      try {
        const res = await fetch(worldUrl(places));
        if (!res.ok) throw new Error("Could not update.");
        const forecast = parseWorld((await res.json()) as WorldReply | WorldReply[], places, Date.now());
        await AsyncStorage.setItem(WORLD_FORECAST_KEY, JSON.stringify(forecast));
        return { places, forecast, stale: false };
      } catch (error) {
        if (same) return { places, forecast: same, stale: true };
        throw error;
      }
    },
  });
}

/** Saves the world places at once. The forecast refreshes for the new list. */
export function useSaveWorldPlaces() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (places: Place[]) => AsyncStorage.setItem(WORLD_PLACES_KEY, JSON.stringify(places)),
    onSettled: () => client.invalidateQueries({ queryKey: WORLD_KEY }),
  });
}
