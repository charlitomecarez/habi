-- Matches and standings for five football leagues and the NBA. No user owns these rows, so
-- apply_owner_rls does not fit. With RLS on and no write policy, only sports-sync can write.
create table public.sports_matches (
  league      text not null check (league in ('PL', 'PD', 'FL1', 'BL1', 'PPL', 'NBA')),
  external_id text not null,
  starts_at   timestamptz not null,
  status      text not null check (status in ('scheduled', 'final', 'postponed')),
  home_team   text not null,
  away_team   text not null,
  home_score  smallint,
  away_score  smallint,
  updated_at  timestamptz not null default now(),
  primary key (league, external_id)
);
create index sports_matches_league_time_idx on public.sports_matches (league, starts_at);

create table public.sports_standings (
  league        text not null check (league in ('PL', 'PD', 'FL1', 'BL1', 'PPL', 'NBA')),
  team          text not null,
  position      smallint not null,
  played        smallint not null,
  won           smallint not null,
  drawn         smallint,
  lost          smallint not null,
  points        smallint, -- null for the NBA
  is_calculated boolean not null default false, -- true when the app counted the order
  updated_at    timestamptz not null default now(),
  primary key (league, team)
);

create table public.sports_sync (
  league        text primary key check (league in ('PL', 'PD', 'FL1', 'BL1', 'PPL', 'NBA')),
  last_ok_at    timestamptz,
  last_error_at timestamptz
);

alter table public.sports_matches enable row level security;
alter table public.sports_standings enable row level security;
alter table public.sports_sync enable row level security;
create policy "signed_in_read" on public.sports_matches for select to authenticated using (true);
create policy "signed_in_read" on public.sports_standings for select to authenticated using (true);
create policy "signed_in_read" on public.sports_sync for select to authenticated using (true);

-- 7 AM and 3 PM PHT.
select cron.schedule('sports-sync', '0 23,7 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/sports-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
$job$);
