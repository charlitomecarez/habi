import { describe, expect, it, vi } from "vitest";

import {
  addWorldPlace,
  DEFAULT_WORLD,
  localTime,
  parseForecast,
  parseWorld,
  weatherIcon,
  weatherWord,
  worldRegion,
  worldUrl,
} from "@/lib/weather";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));

describe("weatherWord", () => {
  it("names the common codes", () => {
    expect(weatherWord(0)).toBe("Clear");
    expect(weatherWord(2)).toBe("Partly cloudy");
    expect(weatherWord(63)).toBe("Rain");
    expect(weatherWord(81)).toBe("Rain showers");
    expect(weatherWord(95)).toBe("Thunderstorm");
  });
});

describe("weatherIcon", () => {
  it("draws each kind of weather", () => {
    expect(weatherIcon(0)).toBe("sunny");
    expect(weatherIcon(2)).toBe("partly-sunny");
    expect(weatherIcon(3)).toBe("cloudy");
    expect(weatherIcon(45)).toBe("cloud-outline");
    expect(weatherIcon(63)).toBe("rainy");
    expect(weatherIcon(81)).toBe("rainy");
    expect(weatherIcon(73)).toBe("snow");
    expect(weatherIcon(95)).toBe("thunderstorm");
  });

  it("shows the moon at night", () => {
    expect(weatherIcon(0, false)).toBe("moon");
    expect(weatherIcon(1, false)).toBe("cloudy-night");
    expect(weatherIcon(63, false)).toBe("rainy");
  });

  it("draws nothing for a saved forecast with no code", () => {
    expect(weatherIcon(undefined)).toBeNull();
  });
});

describe("parseForecast", () => {
  const reply = {
    current: { temperature_2m: 24.4, weather_code: 2 },
    hourly: {
      time: ["2026-11-07T10:00", "2026-11-07T13:00", "2026-11-08T10:00"],
      temperature_2m: [25.2, 27.1, 26],
    },
    daily: {
      time: ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"],
      temperature_2m_max: [27.4, 27, 28, 29],
      temperature_2m_min: [21.2, 21, 22, 22],
      precipitation_probability_max: [40, 60, 30, 20],
    },
  };

  it("rounds, and keeps only today's set hours", () => {
    const f = parseForecast(reply, 1);
    expect(f).toMatchObject({ temperature: 24, word: "Partly cloudy", rain: 40, high: 27, low: 21 });
    expect(f.hours).toMatchObject([
      { time: "10:00", temperature: 25 },
      { time: "13:00", temperature: 27 },
    ]);
  });

  it("keeps the codes for the icons, and treats a missing is_day as day", () => {
    const f = parseForecast(
      {
        ...reply,
        current: { ...reply.current, is_day: 0 },
        hourly: {
          ...reply.hourly,
          weather_code: reply.hourly.time.map(() => 61),
          is_day: reply.hourly.time.map(() => 0),
        },
        daily: { ...reply.daily, weather_code: reply.daily.time.map(() => 95) },
      },
      1,
    );
    expect(f).toMatchObject({ code: reply.current.weather_code, isDay: false });
    expect(f.hours[0]).toMatchObject({ code: 61, isDay: false });
    expect(f.days[0].code).toBe(95);
    expect(parseForecast(reply, 1).isDay).toBe(true);
  });

  it("gives the next 3 days", () => {
    const f = parseForecast(reply, 1);
    expect(f.days.map((d) => d.date)).toEqual(["2026-11-08", "2026-11-09", "2026-11-10"]);
    expect(f.days[0]).toMatchObject({ rain: 60, high: 27, low: 21 });
  });
});

describe("world weather", () => {
  const five = DEFAULT_WORLD;

  it("builds one URL for 5 places, with each place's own time zone", () => {
    const url = new URL(worldUrl(five));
    expect(url.searchParams.get("latitude")?.split(",")).toHaveLength(5);
    expect(url.searchParams.get("longitude")?.split(",")).toHaveLength(5);
    expect(url.searchParams.get("timezone")).toBe("auto");
  });

  it("reads one reply per place, in order", () => {
    const reply = (t: number, offset: number) => ({
      utc_offset_seconds: offset,
      current: { temperature_2m: t, weather_code: 0, is_day: 1 },
      daily: { temperature_2m_max: [t + 2.4], temperature_2m_min: [t - 3.6] },
    });
    const forecast = parseWorld([reply(23.6, 28800), reply(14.2, 32400)], five.slice(0, 2), 1000);
    expect(forecast.items.map((i) => [i.place.name, i.temperature, i.high, i.low, i.utcOffsetSeconds])).toEqual([
      ["Hong Kong", 24, 26, 20, 28800],
      ["Tokyo", 14, 17, 11, 32400],
    ]);
  });

  it("reads a single reply for one place", () => {
    const one = {
      utc_offset_seconds: 3600,
      current: { temperature_2m: 15, weather_code: 61 },
      daily: { temperature_2m_max: [16], temperature_2m_min: [11] },
    };
    expect(parseWorld(one, [five[2]], 1).items[0].word).toBe("Rain");
  });

  it("labels the local date against yours", () => {
    vi.stubEnv("TZ", "Asia/Manila");
    // 6:12 PM in Manila on Nov 10.
    const now = Date.UTC(2026, 10, 10, 10, 12);
    expect(localTime(now, 9 * 3600)).toEqual({ time: "7:12 PM", day: null });
    expect(localTime(now, -8 * 3600)).toEqual({ time: "2:12 AM", day: null });
    // 1:30 AM on Nov 11 in Manila.
    const late = Date.UTC(2026, 10, 10, 17, 30);
    expect(localTime(late, -8 * 3600)).toEqual({ time: "9:30 AM", day: "Yesterday" });
    // 11:00 PM on Nov 10 in Manila.
    const night = Date.UTC(2026, 10, 10, 15, 0);
    expect(localTime(night, 9 * 3600)).toEqual({ time: "12:00 AM", day: "Tomorrow" });
    vi.unstubAllEnvs();
  });

  it("adds a place at the end, once, up to 6", () => {
    const paris = { name: "Paris", region: "France", latitude: 48.8534, longitude: 2.3488 };
    expect(addWorldPlace(five, paris).at(-1)).toBe(paris);
    expect(addWorldPlace(five, five[0])).toBe(five);
    const six = addWorldPlace(five, paris);
    expect(addWorldPlace(six, { ...paris, name: "Lyon", latitude: 45.75 })).toBe(six);
  });

  it("names the region without repeating the place", () => {
    expect(worldRegion({ name: "Los Angeles", admin1: "California", country: "United States" })).toBe(
      "California, United States",
    );
    expect(worldRegion({ name: "Hong Kong", admin1: "Hong Kong", country: "Hong Kong" })).toBe("Hong Kong");
    expect(worldRegion({ name: "Rome", admin1: "Lazio", country: "Italy" })).toBe("Lazio, Italy");
  });
});
