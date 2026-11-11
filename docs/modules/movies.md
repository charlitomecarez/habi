# Movies

Movies lists the films in Philippine cinemas, from TMDB. It is in More › Daily life, after Sports. It shows only when the server has `TMDB_KEY`.

## Screens

- **List** (`app/(app)/movies/index.tsx`): Now showing and Coming soon. A row has the poster, the title, the date and the genres. Now showing puts the TMDB rating in the number place; a film with fewer than 20 votes says "Not rated yet". Coming soon groups films by week and month, with the days to go.
- **Film** (`app/(app)/movies/[id].tsx`): the larger poster, the rating, the date, the runtime, the genres, the story and Watch trailer. The screen is read-only, so Watch trailer is a secondary button. With no trailer, a line says "No trailer yet".
- Each screen ends with the TMDB credit, as the TMDB terms ask.

## Data

- `movies` (shared): 20 films for `now` and 20 for `soon`, region PH. Key `(list, tmdb_id)`.
- `movies_sync` (shared, one row): `last_ok_at` and `last_error_at`. A failed update shows "Could not update" with the time of the last list.
- `movies-sync` runs at 6 AM PHT from pg_cron. It reads the two TMDB lists, then each film's details with its videos and release dates. It uses the Philippine cinema date when TMDB has one. `replace_movies()` swaps each list in one transaction, so a failed run keeps the old list.
- `TMDB_KEY` is an Edge Function secret. A v3 key and a v4 read token both work. The app never calls TMDB, except for poster images from `image.tmdb.org`.

## Not in Movies

- Cinema showtimes. TMDB has none.
