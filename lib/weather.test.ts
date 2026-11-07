import { describe, expect, it, vi } from "vitest";

import { parseForecast, weatherIcon, weatherWord } from "@/lib/weather";

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
