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
  rain: number;
  high: number;
  low: number;
  hours: { time: string; temperature: number }[];
  days: { date: string; rain: number; high: number; low: number }[];
};

/** The WMO weather codes that Open-Meteo sends, in words. */
export function weatherWord(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 82) return "Rain showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

type ForecastReply = {
  current: { temperature_2m: number; weather_code: number };
  hourly: { time: string[]; temperature_2m: number[] };
  daily: {
    time: string[];
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
    rain: daily.precipitation_probability_max[0] ?? 0,
    high: Math.round(daily.temperature_2m_max[0]),
    low: Math.round(daily.temperature_2m_min[0]),
    hours: HOURS.flatMap((time) => {
      const index = hourly.time.indexOf(`${today}T${time}`);
      return index === -1 ? [] : [{ time, temperature: Math.round(hourly.temperature_2m[index]) }];
    }),
    days: daily.time.slice(1, 4).map((date, i) => ({
      date,
      rain: daily.precipitation_probability_max[i + 1] ?? 0,
      high: Math.round(daily.temperature_2m_max[i + 1]),
      low: Math.round(daily.temperature_2m_min[i + 1]),
    })),
  };
}

async function fetchForecast(place: Place): Promise<Forecast> {
  const query = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,weather_code",
    hourly: "temperature_2m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
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

export async function searchPlaces(name: string): Promise<Place[]> {
  const query = new URLSearchParams({ name, count: "8", countryCode: "PH", language: "en" });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${query}`);
  if (!res.ok) throw new Error("Could not search.");
  const json = (await res.json()) as {
    results?: { name: string; admin1?: string; latitude: number; longitude: number }[];
  };
  return (json.results ?? []).map((r) => ({
    name: r.name,
    region: r.admin1 ?? "Philippines",
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
