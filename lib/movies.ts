import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format, isSameMonth, parseISO, startOfWeek } from "date-fns";
import { Linking } from "react-native";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

// Films in Philippine cinemas from TMDB. movies-sync fills the shared table each morning; the app only
// reads it. The TMDB terms ask for their credit on each screen that shows their data.

export type Movie = Tables<"movies">;
export type MovieListId = "now" | "soon";

export const MOVIE_LISTS = [
  { value: "now", label: "Now showing" },
  { value: "soon", label: "Coming soon" },
] as const;

export const TMDB_CREDIT = "Film data from TMDB. Habi uses the TMDB API but is not endorsed or certified by TMDB.";
/** A film needs this many votes before its rating shows, so a new film never shows a weak number. */
export const MIN_VOTES = 20;

const KEY = ["movies"] as const;

/** A w185 poster from TMDB's image server. Null when the film has none. */
export function posterUrl(path: string | null, size: "w185" | "w342" = "w185"): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

/** "7.8" when enough people voted, else null. */
export function ratingText(m: Pick<Movie, "vote_average" | "vote_count">): string | null {
  return m.vote_average !== null && m.vote_count >= MIN_VOTES ? m.vote_average.toFixed(1) : null;
}

/** "2 h 4 min", or "58 min". */
export function runtimeText(minutes: number | null): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/** "Opened Nov 5" or "Opens Nov 26"; with `long`, "Opened Wed, Nov 5". */
export function openedText(date: string | null, now = new Date(), long = false): string | null {
  if (!date) return null;
  const d = parseISO(date);
  return `${differenceInCalendarDays(d, now) > 0 ? "Opens" : "Opened"} ${format(d, long ? "EEE, MMM d" : "MMM d")}`;
}

/** The right-hand word of a coming film: "Today", "In 1 day", "In 3 days", or the date after a week. */
export function soonText(date: string | null, now = new Date()): string | null {
  if (!date) return null;
  const days = differenceInCalendarDays(parseISO(date), now);
  if (days <= 0) return "Today";
  if (days < 7) return `In ${days} ${days === 1 ? "day" : "days"}`;
  return format(parseISO(date), "MMM d");
}

export type MovieGroup = { title: string; movies: Movie[] };

/** Coming soon in groups: This week, Next week, then by month. Films keep their order. */
export function groupSoon(movies: readonly Movie[], now = new Date()): MovieGroup[] {
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const groups: MovieGroup[] = [];
  for (const m of movies) {
    const d = m.release_date ? parseISO(m.release_date) : null;
    const weeks = d ? Math.floor(differenceInCalendarDays(startOfWeek(d, { weekStartsOn: 1 }), thisWeek) / 7) : null;
    const title =
      d === null
        ? "No date yet"
        : weeks !== null && weeks <= 0
          ? "This week"
          : weeks === 1
            ? "Next week"
            : isSameMonth(d, now)
              ? "Later this month"
              : format(d, "MMMM");
    const last = groups.at(-1);
    if (last?.title === title) last.movies.push(m);
    else groups.push({ title, movies: [m] });
  }
  return groups;
}

export function useMovies() {
  return useQuery({
    queryKey: KEY,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const [movies, sync] = await Promise.all([
        supabase.from("movies").select("*").order("position"),
        supabase.from("movies_sync").select("*").maybeSingle(),
      ]);
      if (movies.error) throw movies.error;
      if (sync.error) throw sync.error;
      return {
        now: movies.data.filter((m) => m.list === "now"),
        soon: movies.data.filter((m) => m.list === "soon"),
        sync: sync.data,
      };
    },
  });
}

/** One film, from either list. */
export function useMovie(id: number) {
  const movies = useMovies();
  const all = [...(movies.data?.now ?? []), ...(movies.data?.soon ?? [])];
  return { ...movies, data: all.find((m) => m.tmdb_id === id) };
}

/** Opens the trailer in the YouTube app, or in the browser when the app is not there. */
export const openTrailer = (key: string) =>
  Linking.openURL(`https://www.youtube.com/watch?v=${encodeURIComponent(key)}`);
