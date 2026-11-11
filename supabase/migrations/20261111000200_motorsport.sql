-- v1.6.0 milestone 2: F1 and MotoGP in Sports.
--   motor_races, motor_results and motor_standings are shared, like sports_matches: RLS on, read for
--   signed-in accounts, and only the service role in sports-sync writes them.
--   sports_sync also takes F1 and MGP, so the stale notice works the same way.
--   user_settings.followed_series holds the series that show on Home. It is not part of the 12-team limit.
--   home_summary() returns the followed series' races from 3 days ago to 7 days ahead, with the winner.
--   The motor-sync cron calls sports-sync every 2 hours at 10 past each odd UTC hour, so one run is 7:10 AM PHT.
-- Destructive: the sports_sync league check is dropped and added again, wider. No row is lost.

create table public.motor_races (
  series     text not null check (series in ('F1', 'MGP')),
  season     smallint not null,
  round      smallint not null,
  name       text not null,
  circuit    text not null,
  country    text not null,
  starts_at  timestamptz not null,
  sprint_at  timestamptz,
  status     text not null default 'scheduled' check (status in ('scheduled', 'final', 'cancelled')),
  updated_at timestamptz not null default now(),
  primary key (series, season, round)
);
create index motor_races_series_time_idx on public.motor_races (series, starts_at);

create table public.motor_results (
  series     text not null,
  season     smallint not null,
  round      smallint not null,
  position   smallint not null check (position between 1 and 10),
  name       text not null,
  team       text not null,
  points     numeric(4, 1) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (series, season, round, position),
  foreign key (series, season, round) references public.motor_races on delete cascade
);

create table public.motor_standings (
  series     text not null check (series in ('F1', 'MGP')),
  kind       text not null check (kind in ('rider', 'team')),
  position   smallint not null,
  name       text not null,
  team       text,
  points     numeric(5, 1) not null,
  wins       smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (series, kind, name)
);

alter table public.motor_races enable row level security;
alter table public.motor_results enable row level security;
alter table public.motor_standings enable row level security;
create policy "signed_in_read" on public.motor_races for select to authenticated using (true);
create policy "signed_in_read" on public.motor_results for select to authenticated using (true);
create policy "signed_in_read" on public.motor_standings for select to authenticated using (true);

alter table public.sports_sync drop constraint sports_sync_league_check;
alter table public.sports_sync add constraint sports_sync_league_check
  check (league in ('PL', 'PD', 'FL1', 'BL1', 'PPL', 'NBA', 'F1', 'MGP'));

alter table public.user_settings
  add column followed_series text[] not null default '{}'
    check (followed_series <@ array['F1', 'MGP']::text[]);

-- Home: the same summary as 20261111000100, plus the races of the followed series.
create or replace function public.home_summary(
  p_today date,
  p_month_start date,
  p_month_end date,
  p_done_since timestamptz,
  p_dose_from timestamptz,
  p_dose_to timestamptz,
  p_habits_since date,
  p_ulam_from date,
  p_games_from timestamptz,
  p_games_to timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with
  me as (select (select auth.uid()) as id),
  vehicle as (
    select id, nickname, make, model, current_odometer_km, created_at
    from vehicles order by is_primary desc, created_at limit 1
  ),
  settings as (
    select timezone, digest_enabled, digest_hour, home_shortcuts, ulam_limit, ulam_avoid, followed_teams, hidden_modules,
           health_check, followed_series
    from user_settings limit 1
  ),
  budgets as (select id, category_id, monthly_limit, starts_on from money_budgets),
  leagues as (
    select distinct split_part(f, ':', 1) as league
    from settings, unnest(settings.followed_teams) f
    where position(':' in f) > 1 and position(':' in f) < length(f)
  )
  select jsonb_build_object(
    'todos', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.due_at nulls last, t.created_at), '[]')
      from (
        select id, title, notes, priority, due_at, remind_at, repeat, completed_at, created_at
        from todos where completed_at is null or completed_at >= p_done_since
      ) t
    ),
    'vehicle', (select to_jsonb(v) from vehicle v),
    'services_due', (
      select coalesce(jsonb_agg(to_jsonb(d) order by d.sort_order), '[]')
      from (
        select vehicle_service_id, item, status, next_due_km, next_due_on, km_remaining, days_remaining, sort_order, interval_km
        from vehicle_service_due where vehicle_id = (select id from vehicle)
      ) d
    ),
    'subscriptions', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.next_billing_on), '[]')
      from (
        select id, name, amount, currency, billing_cycle, next_billing_on, account_id, category_id, remind_days_before,
               notes, auto_add, kind, monthly_php, rate_to_php
        from subscription_costs where is_active
      ) s
    ),
    'medicines', (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.name), '[]')
      from (select id, name, dose, times, start_on, end_on, note, created_at from medicines) m
    ),
    'doses', (
      select coalesce(jsonb_agg(to_jsonb(d) order by d.scheduled_at), '[]')
      from (
        select id, medicine_id, medicine_name, dose, scheduled_at, status, marked_at
        from medicine_doses where scheduled_at >= p_dose_from and scheduled_at <= p_dose_to
      ) d
    ),
    'visits', (
      select coalesce(jsonb_agg(to_jsonb(v) order by v.visited_on desc), '[]')
      from (select id, visited_on, doctor, reason, notes, photo_paths, created_at from health_visits) v
    ),
    'weights', (
      select coalesce(jsonb_agg(to_jsonb(w) order by w.on_date), '[]')
      from (select id, on_date, weight_kg, source from weight_logs) w
    ),
    'debts', (
      select coalesce(jsonb_agg(to_jsonb(d) order by d.occurred_on desc), '[]')
      from (select id, person_name, person_id, direction, amount, occurred_on, due_on, note, created_at from debts) d
    ),
    'debt_balances', (
      select coalesce(jsonb_agg(to_jsonb(b)), '[]') from (select debt_id, paid, balance from debt_balances) b
    ),
    'people', (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.name), '[]') from (select id, name, note from people) p
    ),
    'person_dates', (
      select coalesce(jsonb_agg(to_jsonb(d)), '[]')
      from (select id, person_id, kind, label, month, day, year from person_dates) d
    ),
    'gift_ideas', (
      select coalesce(jsonb_agg(to_jsonb(g) - 'created_at' order by g.created_at), '[]')
      from (select id, person_id, title, price, bought_at, created_at from gift_ideas) g
    ),
    'month_transactions', (
      select coalesce(jsonb_agg(to_jsonb(t) - 'created_at' order by t.occurred_on, t.created_at desc), '[]')
      from (
        select id, kind, account_id, to_account_id, category_id, subscription_id, amount, occurred_on, merchant, note,
               external_ref, created_at
        from transactions where occurred_on >= p_month_start and occurred_on < p_month_end
      ) t
    ),
    'settings', (select to_jsonb(s) from settings s),
    'budgets', (select coalesce(jsonb_agg(to_jsonb(b)), '[]') from budgets b),
    'budget_spending', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]')
      from (
        select category_id, amount, occurred_on from transactions
        where kind = 'expense'
          and category_id in (select category_id from budgets)
          and occurred_on >= (select min(starts_on) from budgets)
      ) t
    ),
    'habits', (
      select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at), '[]')
      from (
        select id, name, schedule, weekdays, times_per_week, remind_time, archived, created_at
        from habits where not archived
      ) h
    ),
    'habit_checks', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]')
      from (select habit_id, on_date from habit_checks where on_date >= p_habits_since) c
    ),
    'ulam_days', (
      select coalesce(jsonb_agg(to_jsonb(u)), '[]')
      from (
        select on_date, options, picked, custom, source, eaten
        from ulam_days where on_date >= p_ulam_from and on_date < p_today + 1
      ) u
    ),
    'admin', (select to_jsonb(a) from (select user_id from app_admins limit 1) a),
    'has_voice_access', has_voice_access(),
    'voice_contacts', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from voice_contacts() c),
    'inbox', (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc), '[]')
      from (
        select id, audio_path, duration_s, transcript, status, read_at, created_at
        from voice_messages where recipient_id = (select id from me)
        order by created_at desc limit 50
      ) m
    ),
    'tip', (select to_jsonb(t) from (select topic, tip from daily_tips where on_date = p_today limit 1) t),
    'news', (
      select coalesce(jsonb_agg(to_jsonb(n) order by n.published_at desc), '[]')
      from (select * from news_items where section = 'ph' order by published_at desc limit 3) n
    ),
    'health_insights', (
      select coalesce(jsonb_agg(to_jsonb(h) order by h.day desc), '[]')
      from (select id, day, tips, based_on, created_at from health_insights order by day desc limit 2) h
    ),
    'game_leagues', (select coalesce(jsonb_agg(l.league order by l.league), '[]') from leagues l),
    'games', (
      select coalesce(jsonb_agg(to_jsonb(g) order by g.starts_at), '[]')
      from (
        select * from sports_matches
        where league in (select league from leagues) and starts_at >= p_games_from and starts_at <= p_games_to
      ) g
    ),
    'races', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.starts_at), '[]')
      from (
        select r.series, r.season, r.round, r.name, r.circuit, r.country, r.starts_at, r.sprint_at, r.status,
               w.name as winner
        from motor_races r
        left join motor_results w
          on w.series = r.series and w.season = r.season and w.round = r.round and w.position = 1
        where r.series in (select unnest(s.followed_series) from settings s)
          and r.status <> 'cancelled'
          and r.starts_at >= p_games_from
          and r.starts_at <= now() + interval '7 days'
      ) r
    )
  );
$$;

revoke execute on function public.home_summary(date, date, date, timestamptz, timestamptz, timestamptz, date, date, timestamptz, timestamptz) from public, anon;
grant execute on function public.home_summary(date, date, date, timestamptz, timestamptz, timestamptz, date, date, timestamptz, timestamptz) to authenticated;

select cron.schedule('motor-sync', '10 1-23/2 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/sports-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')),
    body := '{"only":"motor"}'::jsonb,
    timeout_milliseconds := 120000);
$job$);
