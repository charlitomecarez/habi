import { describe, expect, it } from "vitest";

import {
  f1DriverStandings,
  f1Races,
  f1Results,
  f1TeamStandings,
  mgpRace,
  mgpRaceEvents,
  mgpResults,
  mgpRiderStandings,
  mgpTeamStandings,
  motorDue,
  titleCase,
  type JolpicaRace,
  type MgpEvent,
} from "./motor.ts";

const race = (round: string, extra: Partial<JolpicaRace> = {}): JolpicaRace => ({
  season: "2026",
  round,
  raceName: "Qatar Grand Prix",
  Circuit: { circuitName: "Lusail International Circuit", Location: { country: "Qatar" } },
  date: "2026-11-29",
  time: "16:00:00Z",
  ...extra,
});

describe("F1", () => {
  it("reads the rounds, the sprint and which rounds are final", () => {
    const rows = f1Races(
      [race("21"), race("22", { Sprint: { date: "2026-11-28", time: "11:00:00Z" } }), race("23", { time: undefined })],
      21,
    );
    expect(rows.map((r) => r.status)).toEqual(["final", "scheduled", "scheduled"]);
    expect(rows[1]).toMatchObject({ season: 2026, round: 22, country: "Qatar", sprint_at: "2026-11-28T11:00:00.000Z" });
    expect(rows[2].starts_at).toBe("2026-11-29T12:00:00.000Z");
  });

  it("keeps the top 10 of a race", () => {
    const results = Array.from({ length: 20 }, (_, i) => ({
      position: String(i + 1),
      points: i === 0 ? "25" : "0",
      Driver: { givenName: "Driver", familyName: String(i + 1) },
      Constructor: { name: "Team" },
    }));
    const rows = f1Results(race("20", { Results: results }));
    expect(rows).toHaveLength(10);
    expect(rows[0]).toEqual({
      series: "F1",
      season: 2026,
      round: 20,
      position: 1,
      name: "Driver 1",
      team: "Team",
      points: 25,
    });
    expect(f1Results(race("1"))).toEqual([]);
  });

  it("reads driver and team standings, with a place for an unclassified driver", () => {
    const drivers = f1DriverStandings([
      {
        position: "1",
        points: "390",
        wins: "9",
        Driver: { givenName: "A", familyName: "B" },
        Constructors: [{ name: "X" }, { name: "Y" }],
      },
      { positionText: "-", points: "0", wins: "0", Driver: { givenName: "C", familyName: "D" }, Constructors: [] },
    ]);
    expect(drivers[0]).toMatchObject({ kind: "rider", name: "A B", team: "Y", points: 390, wins: 9 });
    expect(drivers[1]).toMatchObject({ position: 2, team: null });
    expect(
      f1TeamStandings([{ position: "1", points: "652", wins: "12", Constructor: { name: "Mercedes" } }])[0],
    ).toMatchObject({
      kind: "team",
      name: "Mercedes",
      team: null,
      points: 652,
    });
  });
});

describe("MotoGP", () => {
  const event = (over: Partial<MgpEvent>): MgpEvent => ({
    id: "e",
    name: "GRAND PRIX OF THE UNITED STATES",
    date_start: "2026-03-27",
    test: false,
    status: "NOT-STARTED",
    circuit: { name: "Circuit Of The Americas" },
    country: { name: "United States of America" },
    ...over,
  });

  it("names an event in title case", () => {
    expect(titleCase("GRAND PRIX OF THE UNITED STATES")).toBe("Grand Prix of the United States");
  });

  it("keeps race events in date order and drops tests", () => {
    const list = mgpRaceEvents([
      event({ id: "b", date_start: "2026-04-01" }),
      event({ id: "t", test: true }),
      event({ id: "a", date_start: "2026-03-01" }),
    ]);
    expect(list.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("takes the race and sprint times from the sessions", () => {
    const row = mgpRace(event({ status: "FINISHED" }), 3, 2026, [
      { id: "s", type: "SPR", date: "2026-03-28T19:00:00+00:00", status: "FINISHED" },
      { id: "r", type: "RAC", date: "2026-03-29T19:00:00+00:00", status: "FINISHED" },
    ]);
    expect(row).toMatchObject({
      round: 3,
      status: "final",
      starts_at: "2026-03-29T19:00:00.000Z",
      sprint_at: "2026-03-28T19:00:00.000Z",
    });
    expect(mgpRace(event({ status: "CANCELLED" }), 4, 2026, []).status).toBe("cancelled");
    const noSessions = mgpRace(event({ circuit: null, country: null }), 5, 2026, []);
    expect(noSessions).toMatchObject({
      status: "scheduled",
      starts_at: "2026-03-27T12:00:00.000Z",
      circuit: "",
      sprint_at: null,
    });
  });

  it("keeps the classified top 10", () => {
    const rows = mgpResults(
      [
        { position: 1, points: 25, rider: { full_name: "Rider A" }, team: { name: "Team A" } },
        { position: null, rider: { full_name: "DNF" } },
        { position: 11, points: 5 },
        { position: 2 },
      ],
      2026,
      1,
    );
    expect(rows).toEqual([
      { series: "MGP", season: 2026, round: 1, position: 1, name: "Rider A", team: "Team A", points: 25 },
      { series: "MGP", season: 2026, round: 1, position: 2, name: "", team: "", points: 0 },
    ]);
  });

  it("adds each team's rider points", () => {
    const standings = [
      { position: 1, points: 431, race_wins: 7, rider: { full_name: "A" }, team: { name: "Ducati" } },
      { position: 2, points: 300, race_wins: 2, rider: { full_name: "B" }, team: { name: "Aprilia" } },
      { position: 3, points: 200, race_wins: null, rider: { full_name: "C" }, team: { name: "Ducati" } },
      { position: 4, points: 1, rider: null, team: null },
    ];
    expect(mgpRiderStandings(standings)[2]).toMatchObject({ name: "C", wins: 0 });
    expect(mgpRiderStandings(standings)[3]).toMatchObject({ name: "", team: null });
    expect(mgpTeamStandings(standings)).toEqual([
      { series: "MGP", kind: "team", position: 1, name: "Ducati", team: null, points: 631, wins: 7 },
      { series: "MGP", kind: "team", position: 2, name: "Aprilia", team: null, points: 300, wins: 2 },
    ]);
  });
});

describe("when to call the sources", () => {
  const now = Date.parse("2026-11-25T03:10:00Z"); // 11:10 AM PHT

  it("calls at the 7 AM PHT run", () => {
    expect(motorDue(Date.parse("2026-11-24T23:10:00Z"), [])).toBe(true);
    expect(motorDue(now, [])).toBe(false);
  });

  it("calls in the 72 hours before a race and the 8 hours after its start", () => {
    expect(motorDue(now, ["2026-11-28T03:00:00Z"])).toBe(true);
    expect(motorDue(now, ["2026-11-24T20:00:00Z"])).toBe(true);
    expect(motorDue(now, ["2026-11-29T03:00:00Z", "2026-11-20T00:00:00Z"])).toBe(false);
  });
});
