import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  groupSoon,
  openedText,
  openTrailer,
  posterUrl,
  ratingText,
  runtimeText,
  soonText,
  useMovie,
  useMovies,
  type Movie,
} from "@/lib/movies";
import { runQuery } from "@/lib/test/fake-query";
import { resetSupabase, respond, targets } from "@/lib/test/fake-supabase";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
const linking = vi.hoisted(() => ({ openURL: vi.fn(async () => true) }));
vi.mock("react-native", () => ({ Linking: linking }));

const film = (over: Partial<Movie>): Movie => ({
  list: "now",
  tmdb_id: 1,
  position: 1,
  title: "The Long Monsoon",
  release_date: "2026-11-05",
  overview: "",
  poster_path: "/a.jpg",
  genres: ["Drama"],
  runtime_min: 124,
  vote_average: 7.8,
  vote_count: 412,
  trailer_key: "abc",
  updated_at: "2026-11-25T22:01:00Z",
  ...over,
});

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("film words", () => {
  const now = new Date(2026, 10, 25);

  it("builds poster links", () => {
    expect(posterUrl("/a.jpg")).toBe("https://image.tmdb.org/t/p/w185/a.jpg");
    expect(posterUrl("/a.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/a.jpg");
    expect(posterUrl(null)).toBeNull();
  });

  it("shows a rating only after 20 votes", () => {
    expect(ratingText(film({}))).toBe("7.8");
    expect(ratingText(film({ vote_count: 19 }))).toBeNull();
    expect(ratingText(film({ vote_average: null }))).toBeNull();
  });

  it("writes the runtime, the opening and the days to go", () => {
    expect(runtimeText(124)).toBe("2 h 4 min");
    expect(runtimeText(120)).toBe("2 h");
    expect(runtimeText(58)).toBe("58 min");
    expect(runtimeText(null)).toBeNull();
    expect(openedText("2026-11-05", now)).toBe("Opened Nov 5");
    expect(openedText("2026-11-26", now, true)).toBe("Opens Thu, Nov 26");
    expect(openedText(null, now)).toBeNull();
    expect(["2026-11-25", "2026-11-26", "2026-11-28", "2026-12-10"].map((d) => soonText(d, now))).toEqual([
      "Today",
      "In 1 day",
      "In 3 days",
      "Dec 10",
    ]);
    expect(soonText(null, now)).toBeNull();
  });

  it("groups coming films by week and month", () => {
    const groups = groupSoon(
      [
        film({ tmdb_id: 1, release_date: "2026-11-26" }),
        film({ tmdb_id: 2, release_date: "2026-12-02" }),
        film({ tmdb_id: 3, release_date: "2026-11-30" }),
        film({ tmdb_id: 4, release_date: "2026-12-17" }),
        film({ tmdb_id: 5, release_date: "2027-01-08" }),
        film({ tmdb_id: 6, release_date: null }),
      ],
      now,
    );
    expect(groups.map((g) => [g.title, g.movies.map((m) => m.tmdb_id)])).toEqual([
      ["This week", [1]],
      ["Next week", [2, 3]],
      ["December", [4]],
      ["January", [5]],
      ["No date yet", [6]],
    ]);
    expect(groupSoon([film({ release_date: "2026-11-30" })], new Date(2026, 10, 10))[0].title).toBe("Later this month");
  });

  it("opens the trailer on YouTube", async () => {
    await openTrailer("abc");
    expect(linking.openURL).toHaveBeenCalledWith("https://www.youtube.com/watch?v=abc");
  });
});

describe("movies data", () => {
  it("splits the two lists and reads the sync times", async () => {
    respond({ data: [film({ list: "now" }), film({ list: "soon", tmdb_id: 2 })] }, { data: { last_ok_at: "x" } });
    const data = (await runQuery(useMovies())) as { now: Movie[]; soon: Movie[]; sync: unknown };
    expect(data.now).toHaveLength(1);
    expect(data.soon[0].tmdb_id).toBe(2);
    expect(targets()).toEqual(["movies", "movies_sync"]);
    expect(useMovie(2).data).toBeUndefined();
    respond({ error: new Error("a") }, {});
    await expect(runQuery(useMovies())).rejects.toThrow("a");
    respond({}, { error: new Error("b") });
    await expect(runQuery(useMovies())).rejects.toThrow("b");
  });
});
