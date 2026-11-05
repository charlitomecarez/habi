import { describe, expect, it, vi } from "vitest";

import {
  groupByDay,
  mapLink,
  timeText,
  tripDatesText,
  tripDays,
  tripHtml,
  tripTotals,
  type TripItem,
} from "@/lib/travel";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const trip = { title: "Baguio", destination: "Benguet", start_date: "2026-12-12", end_date: "2026-12-14" };

const item = (over: Partial<TripItem> = {}): TripItem => ({
  id: "i1",
  trip_id: "t1",
  kind: "go",
  title: "Mines View Park",
  day: "2026-12-12",
  start_time: "16:00:00",
  place: "Mines View",
  map_url: null,
  cost: null,
  currency: "PHP",
  booking_ref: null,
  note: null,
  done: false,
  transaction_id: null,
  document_id: null,
  ...over,
});

describe("dates", () => {
  it("lists every day", () => {
    expect(tripDays(trip)).toEqual(["2026-12-12", "2026-12-13", "2026-12-14"]);
  });

  it("words the dates", () => {
    expect(tripDatesText(trip)).toBe("Dec 12 to 14");
    expect(tripDatesText({ start_date: "2026-12-30", end_date: "2027-01-02" })).toBe("Dec 30 to Jan 2");
    expect(tripDatesText({ start_date: "2026-12-30", end_date: "2026-12-30" })).toBe("Dec 30");
  });

  it("words the time", () => {
    expect(timeText("06:00:00")).toBe("6:00 AM");
    expect(timeText(null)).toBeNull();
  });
});

describe("groupByDay", () => {
  it("keeps empty days, sorts by time, and puts untimed items last", () => {
    const { days } = groupByDay(
      [
        item({ id: "a", title: "Late", start_time: "18:00:00" }),
        item({ id: "b", title: "Early", start_time: "06:00:00" }),
        item({ id: "c", title: "Any time", start_time: null }),
      ],
      trip,
    );
    expect(days).toHaveLength(3);
    expect(days[0].items.map((i) => i.title)).toEqual(["Early", "Late", "Any time"]);
  });

  it("puts an item with no day in Ideas", () => {
    const { days, ideas } = groupByDay([item({ day: null })], trip);
    expect(ideas).toHaveLength(1);
    expect(days.every((d) => d.items.length === 0)).toBe(true);
  });

  it("keeps an item that falls outside the dates, so it is not lost", () => {
    const { days } = groupByDay([item({ day: "2026-12-20" })], trip);
    expect(days.map((d) => d.day)).toContain("2026-12-20");
  });
});

describe("tripTotals", () => {
  const rates = [{ currency: "USD", rateToPhp: 58, updatedAt: "" }];

  it("adds PHP and converted costs, and counts paid items", () => {
    const totals = tripTotals(
      [item({ cost: 900 }), item({ cost: 10, currency: "USD", transaction_id: "tx" }), item({ cost: null })],
      rates,
    );
    expect(totals).toEqual({ planned: 1480, paid: 580, missingRates: [] });
  });

  it("names a currency with no rate, and leaves it out", () => {
    expect(tripTotals([item({ cost: 5, currency: "JPY" })], rates)).toEqual({
      planned: 0,
      paid: 0,
      missingRates: ["JPY"],
    });
  });
});

describe("mapLink", () => {
  it("prefers your link, and builds one from the place", () => {
    expect(mapLink({ map_url: "https://maps.app.goo.gl/x", place: "A" })).toBe("https://maps.app.goo.gl/x");
    expect(mapLink({ map_url: null, place: "Session Road" })).toContain("query=Session%20Road");
  });

  it("ignores a link that is not http", () => {
    expect(mapLink({ map_url: "javascript:alert(1)", place: null })).toBeNull();
  });
});

describe("tripHtml", () => {
  const secrets = item({ booking_ref: "SECRET-REF", note: "SECRET-NOTE", cost: 900 });

  it("shows the title, the days and a map link", () => {
    const html = tripHtml(trip, [item()], { includeCosts: false });
    expect(html).toContain("Baguio");
    expect(html).toContain("Saturday, December 12");
    expect(html).toContain("4:00 PM");
    expect(html).toContain("google.com/maps");
  });

  it("never holds booking references, notes or ideas", () => {
    const html = tripHtml(trip, [secrets, item({ id: "x", day: null, title: "SECRET-IDEA" })], { includeCosts: true });
    expect(html).not.toContain("SECRET");
  });

  it("shows costs only with the switch on", () => {
    expect(tripHtml(trip, [secrets], { includeCosts: false })).not.toContain("₱900");
    expect(tripHtml(trip, [secrets], { includeCosts: true })).toContain("₱900");
  });

  it("escapes what you typed", () => {
    const html = tripHtml({ ...trip, title: "<b>x</b>" }, [item({ title: `<script>alert("x")</script>` })], {
      includeCosts: false,
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;script&gt;");
  });
});
