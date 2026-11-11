-- v1.6.0 milestone 5: Places near you in Travel.
--   places_cache holds public places by area (a cell of about 5 km) and kind, from Geoapify. It holds no
--   user ID and no exact location. A row still says that someone opened Places near that area in the
--   last 7 days, so RLS is on with no policy: only places-nearby, with the service role, reads and writes it.

create table public.places_cache (
  cell       text not null check (cell ~ '^-?\d{1,2}\.\d{2}:-?\d{1,3}\.\d{2}$'),
  category   text not null check (category in ('sights', 'food', 'parks', 'shopping')),
  places     jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (cell, category)
);

alter table public.places_cache enable row level security;
