// Pure Movies rules, shared by the movies-sync function and its tests. The data comes from TMDB.

export type MovieList = "now" | "soon";
export const LIST_SIZE = 20;
export const TMDB_REGION = "PH";

export type TmdbListItem = { id: number; title: string; release_date?: string | null };
export type TmdbVideo = { key: string; site: string; type: string; official?: boolean; published_at?: string };
export type TmdbDetails = {
  id: number;
  title: string;
  release_date?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  genres?: { name: string }[];
  runtime?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
  videos?: { results?: TmdbVideo[] };
  release_dates?: { results?: { iso_3166_1: string; release_dates: { release_date: string; type: number }[] }[] };
};

export type MovieRow = {
  tmdb_id: number;
  position: number;
  title: string;
  release_date: string | null;
  overview: string;
  poster_path: string | null;
  genres: string[];
  runtime_min: number | null;
  vote_average: number | null;
  vote_count: number;
  trailer_key: string | null;
};

/** TMDB takes a v4 read token as a Bearer header, and a v3 key as a query value. */
export function tmdbAuth(key: string): { headers: Record<string, string>; query: Record<string, string> } {
  return key.startsWith("eyJ")
    ? { headers: { Authorization: `Bearer ${key}` }, query: {} }
    : { headers: {}, query: { api_key: key } };
}

/** The YouTube trailer to open: an official trailer first, then any trailer, then a teaser. Newest first. */
export function pickTrailer(videos: readonly TmdbVideo[]): string | null {
  const youtube = videos
    .filter((v) => v.site === "YouTube" && v.key)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  const rank = (v: TmdbVideo) => (v.type === "Trailer" ? (v.official ? 0 : 1) : v.type === "Teaser" ? 2 : 3);
  const best = [...youtube].sort((a, b) => rank(a) - rank(b))[0];
  return best && rank(best) < 3 ? best.key : null;
}

/** The Philippine theatrical date when TMDB has one, else the main release date. */
export function phReleaseDate(details: TmdbDetails): string | null {
  const ph = details.release_dates?.results?.find((r) => r.iso_3166_1 === TMDB_REGION);
  // Types 2 and 3 are limited and wide theatrical releases.
  const theatrical = ph?.release_dates
    .filter((d) => d.type === 2 || d.type === 3)
    .map((d) => d.release_date.slice(0, 10));
  return theatrical?.sort()[0] ?? details.release_date ?? null;
}

export function movieRow(details: TmdbDetails, position: number): MovieRow {
  return {
    tmdb_id: details.id,
    position,
    title: details.title,
    release_date: phReleaseDate(details) || null,
    overview: details.overview ?? "",
    poster_path: details.poster_path ?? null,
    genres: (details.genres ?? []).map((g) => g.name),
    runtime_min: details.runtime || null,
    vote_average: details.vote_average ?? null,
    vote_count: details.vote_count ?? 0,
    trailer_key: pickTrailer(details.videos?.results ?? []),
  };
}

/** Coming soon keeps only films that open after today, soonest first. */
export function soonOrder(items: readonly TmdbListItem[], today: string): TmdbListItem[] {
  return items
    .filter((m) => (m.release_date ?? "") > today)
    .sort((a, b) => (a.release_date ?? "").localeCompare(b.release_date ?? ""));
}
