import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  homeRaces,
  isSeries,
  lastRace,
  lateNightLine,
  nextRace,
  openRace,
  raceSearchUrl,
  raceWhen,
  seriesLabel,
  useFollowedRaces,
  useMotor,
  type HomeRace,
} from "@/lib/motor";
import { runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
const linking = vi.hoisted(() => ({ openURL: vi.fn(async () => true) }));
vi.mock("react-native", () => ({ Linking: linking }));

// Local times, so the tests do not depend on the machine's time zone.
const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

const race = (over: Partial<HomeRace>): HomeRace => ({
  series: "F1",
  season: 2026,
  round: 22,
  name: "Qatar Grand Prix",
  starts_at: local(2026, 11, 29, 0),
  status: "scheduled",
  winner: null,
  ...over,
});

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("race words", () => {
  it("names the series and checks an id", () => {
    expect(seriesLabel("MGP")).toBe("MotoGP");
    expect(seriesLabel("PL")).toBe("PL");
    expect(isSeries("F1")).toBe(true);
    expect(isSeries("NBA")).toBe(false);
  });

  it("writes the race time", () => {
    expect(raceWhen(local(2026, 11, 29, 0))).toBe("Sun, Nov 29 · 12:00 AM");
  });

  it("adds a line for a race after midnight", () => {
    expect(lateNightLine(local(2026, 11, 29, 0))).toBe("Saturday night, at midnight");
    expect(lateNightLine(local(2026, 11, 29, 0, 30))).toBe("Saturday night, after midnight");
    expect(lateNightLine(local(2026, 11, 29, 3))).toBe("Sunday, before dawn");
    expect(lateNightLine(local(2026, 11, 29, 21))).toBeNull();
  });

  it("opens a web search for the race", async () => {
    expect(raceSearchUrl(race({}))).toBe("https://www.google.com/search?q=F1%202026%20Qatar%20Grand%20Prix");
    await openRace(race({}));
    expect(linking.openURL).toHaveBeenCalled();
  });
});

describe("next and last race", () => {
  const races = [
    race({ round: 20, status: "final", starts_at: local(2026, 11, 8, 23) }),
    race({ round: 21, status: "scheduled", starts_at: local(2026, 11, 22, 12) }),
    race({ round: 22, status: "scheduled", starts_at: local(2026, 11, 29, 0) }),
  ];

  it("keeps a running race as next for 3 hours", () => {
    expect(nextRace(races, new Date(local(2026, 11, 22, 14)))?.round).toBe(21);
    expect(nextRace(races, new Date(local(2026, 11, 22, 16)))?.round).toBe(22);
    expect(nextRace(races, new Date(local(2027, 1, 1, 0)))).toBeNull();
    expect(lastRace(races)?.round).toBe(20);
    expect(lastRace([])).toBeNull();
  });

  it("puts the next race on Home in the 7 days before it, else a recent winner", () => {
    const now = new Date(local(2026, 11, 24, 12));
    expect(homeRaces(races, ["F1"], now)).toEqual([{ race: races[2], result: false }]);
    const after = new Date(local(2026, 11, 10, 9));
    const won = [race({ round: 20, status: "final", starts_at: local(2026, 11, 8, 23), winner: "Driver A" }), races[1]];
    expect(homeRaces(won, ["F1", "MGP"], after)).toEqual([{ race: won[0], result: true }]);
    expect(homeRaces(won, ["F1"], new Date(local(2026, 11, 13, 9)))).toEqual([]);
  });
});

describe("motor data", () => {
  it("reads one series and keeps the latest season and the last race's top 10", async () => {
    respond(
      {
        data: [
          { season: 2025, round: 24 },
          { season: 2026, round: 1 },
        ],
      },
      {
        data: [
          { season: 2026, round: 20, position: 1 },
          { season: 2026, round: 19, position: 1 },
        ],
      },
      {
        data: [
          { kind: "rider", name: "A" },
          { kind: "team", name: "T" },
        ],
      },
      { data: { league: "F1", last_ok_at: null } },
    );
    const result = (await runQuery(useMotor("F1"))) as Record<string, unknown[]>;
    expect(result.races).toEqual([{ season: 2026, round: 1 }]);
    expect(result.results).toEqual([{ season: 2026, round: 20, position: 1 }]);
    expect(result.riders).toEqual([{ kind: "rider", name: "A" }]);
    expect(result.teams).toEqual([{ kind: "team", name: "T" }]);
    for (let failing = 0; failing < 4; failing++) {
      respond(...[0, 1, 2, 3].map((i) => (i === failing ? { error: new Error("down") } : {})));
      await expect(runQuery(useMotor("MGP"))).rejects.toThrow("down");
    }
  });

  it("reads the followed races with their winners", async () => {
    respond(
      {
        data: [
          {
            series: "F1",
            season: 2026,
            round: 20,
            name: "Brazil",
            starts_at: new Date(Date.now() - 86_400_000).toISOString(),
            status: "final",
          },
        ],
      },
      { data: [{ series: "F1", season: 2026, round: 20, name: "Driver A" }] },
    );
    const items = (await runQuery(useFollowedRaces(["F1", "PL"]))) as { race: HomeRace; result: boolean }[];
    expect(items[0]).toMatchObject({ result: true, race: { winner: "Driver A" } });
    expect(argsOf("in")[0]).toEqual(["series", ["F1"]]);
    expect(useFollowedRaces([])).toMatchObject({ enabled: false });
    respond({ error: new Error("a") }, {});
    await expect(runQuery(useFollowedRaces(["F1"]))).rejects.toThrow("a");
    respond({}, { error: new Error("b") });
    await expect(runQuery(useFollowedRaces(["F1"]))).rejects.toThrow("b");
  });
});
