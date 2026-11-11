import { describe, expect, it } from "vitest";

import { movieRow, phReleaseDate, pickTrailer, soonOrder, tmdbAuth } from "./movies.ts";

describe("TMDB", () => {
  it("sends a v4 token as a header and a v3 key as a query value", () => {
    expect(tmdbAuth("eyJhbGciOi")).toEqual({ headers: { Authorization: "Bearer eyJhbGciOi" }, query: {} });
    expect(tmdbAuth("abc123")).toEqual({ headers: {}, query: { api_key: "abc123" } });
  });

  it("picks the official trailer, then a trailer, then a teaser", () => {
    const v = (key: string, type: string, official = false, published_at = "2026-01-01") => ({
      key,
      site: "YouTube",
      type,
      official,
      published_at,
    });
    expect(pickTrailer([v("t", "Teaser"), v("u", "Trailer"), v("o", "Trailer", true)])).toBe("o");
    expect(
      pickTrailer([
        v("t", "Teaser"),
        v("old", "Trailer", false, "2025-01-01"),
        v("new", "Trailer", false, "2026-02-01"),
      ]),
    ).toBe("new");
    expect(pickTrailer([v("t", "Teaser")])).toBe("t");
    expect(pickTrailer([v("c", "Clip"), { key: "x", site: "Vimeo", type: "Trailer" }])).toBeNull();
  });

  it("uses the Philippine cinema date when there is one", () => {
    const details = {
      id: 1,
      title: "Film",
      release_date: "2026-10-30",
      release_dates: {
        results: [
          { iso_3166_1: "US", release_dates: [{ release_date: "2026-10-01T00:00:00.000Z", type: 3 }] },
          {
            iso_3166_1: "PH",
            release_dates: [
              { release_date: "2026-11-12T00:00:00.000Z", type: 3 },
              { release_date: "2026-12-01T00:00:00.000Z", type: 4 },
            ],
          },
        ],
      },
    };
    expect(phReleaseDate(details)).toBe("2026-11-12");
    expect(phReleaseDate({ id: 2, title: "x" })).toBeNull();
  });

  it("maps the details to a row", () => {
    expect(
      movieRow(
        {
          id: 9,
          title: "Kapit",
          overview: null,
          genres: [{ name: "Horror" }],
          runtime: 0,
          vote_average: 6.9,
          vote_count: 12,
          videos: { results: [] },
        },
        3,
      ),
    ).toEqual({
      tmdb_id: 9,
      position: 3,
      title: "Kapit",
      release_date: null,
      overview: "",
      poster_path: null,
      genres: ["Horror"],
      runtime_min: null,
      vote_average: 6.9,
      vote_count: 12,
      trailer_key: null,
    });
  });

  it("keeps coming films after today, soonest first", () => {
    const items = [
      { id: 1, title: "B", release_date: "2026-12-03" },
      { id: 2, title: "Old", release_date: "2026-11-01" },
      { id: 3, title: "A", release_date: "2026-11-26" },
      { id: 4, title: "No date", release_date: null },
    ];
    expect(soonOrder(items, "2026-11-25").map((m) => m.id)).toEqual([3, 1]);
  });
});
