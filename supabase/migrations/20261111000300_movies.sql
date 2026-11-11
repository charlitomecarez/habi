-- v1.6.0 milestone 3: Movies.
--   movies holds the films in Philippine cinemas from TMDB: Now showing (list 'now') and Coming soon
--   (list 'soon'), 20 each. It is shared, like news_items: RLS on, read for signed-in accounts, and only
--   the service role in movies-sync writes it.
--   replace_movies() swaps one list in one transaction, so a failed sync keeps the old list. Only the
--   service role can run it.
--   The movies-sync cron runs at 6 AM PHT.

create table public.movies (
  list         text not null check (list in ('now', 'soon')),
  tmdb_id      integer not null,
  position     smallint not null,
  title        text not null,
  release_date date,
  overview     text not null default '',
  poster_path  text,
  genres       text[] not null default '{}',
  runtime_min  smallint,
  vote_average numeric(3, 1),
  vote_count   integer not null default 0,
  trailer_key  text,
  updated_at   timestamptz not null default now(),
  primary key (list, tmdb_id)
);

create table public.movies_sync (
  id            boolean primary key default true check (id),
  last_ok_at    timestamptz,
  last_error_at timestamptz
);

alter table public.movies enable row level security;
alter table public.movies_sync enable row level security;
create policy "signed_in_read" on public.movies for select to authenticated using (true);
create policy "signed_in_read" on public.movies_sync for select to authenticated using (true);

create function public.replace_movies(p_list text, p_rows jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  delete from movies where list = p_list;
  insert into movies (list, tmdb_id, position, title, release_date, overview, poster_path, genres, runtime_min,
                      vote_average, vote_count, trailer_key)
  select p_list, r.tmdb_id, r.position, r.title, r.release_date, coalesce(r.overview, ''), r.poster_path,
         coalesce(r.genres, '{}'), r.runtime_min, r.vote_average, coalesce(r.vote_count, 0), r.trailer_key
  from jsonb_to_recordset(p_rows) as r(
    tmdb_id integer, position smallint, title text, release_date date, overview text, poster_path text,
    genres text[], runtime_min smallint, vote_average numeric, vote_count integer, trailer_key text
  );
$$;
revoke execute on function public.replace_movies(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_movies(text, jsonb) to service_role;

select cron.schedule('movies-sync', '0 22 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/movies-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
$job$);
