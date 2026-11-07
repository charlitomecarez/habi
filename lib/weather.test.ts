import { describe, expect, it, vi } from "vitest";

import { parseForecast, weatherWord } from "@/lib/weather";

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
    expect(f.hours).toEqual([
      { time: "10:00", temperature: 25 },
      { time: "13:00", temperature: 27 },
    ]);
  });

  it("gives the next 3 days", () => {
    const f = parseForecast(reply, 1);
    expect(f.days.map((d) => d.date)).toEqual(["2026-11-08", "2026-11-09", "2026-11-10"]);
    expect(f.days[0]).toMatchObject({ rain: 60, high: 27, low: 21 });
  });
});
