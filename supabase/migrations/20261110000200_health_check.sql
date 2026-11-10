-- v1.5.0 milestone 9: the 6 PM health check. It is off until each account turns it on.
--   health_days      one row a day of sleep and steps, sent by the app only while the check is on
--   health_insights  1 to 3 tips a day. Only the health-insight function (service role) writes them.
--   user_settings.health_check, the 'health' reminder source, clear_health_check(), and the hourly cron job.
--   home_summary() also returns health_check and the last two insights, for the Home row.
-- No row changes. The v1.4.0 APK never reads these tables, and the check starts off.

-- Daily numbers for the 6 PM health check. Only sent while the check is on.
create table public.health_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  sleep_minutes int check (sleep_minutes between 0 and 1440),
  bed_time time,
  wake_time time,
  sleep_source text check (sleep_source in ('health_connect', 'screen', 'typed')),
  steps int check (steps between 0 and 200000),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
select public.apply_owner_rls('public.health_days');
create trigger health_days_updated_at before update on public.health_days
  for each row execute function public.set_updated_at();

create table public.health_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  tips text[] not null
    check (
      cardinality(tips) between 1 and 3
      and array_position(tips, null) is null
      and array_position(tips, '') is null
      and char_length(array_to_string(tips, '')) <= 600
    ),
  based_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
select public.apply_owner_rls('public.health_insights');
-- Only health-insight (service role) writes advice. The owner can read and delete it.
drop policy "owner_insert" on public.health_insights;
drop policy "owner_update" on public.health_insights;

-- A deleted insight takes its unsent 6 PM push with it, so turning the check off between 5:45 and
-- 6:00 PM sends nothing. plpgsql, because its body is checked only when it runs, after the enum
-- value below exists.
create function public.health_insight_clear_reminder()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.reminders where source_type = 'health' and source_id = old.id and sent_at is null;
  return old;
end;
$$;
create trigger health_insights_clear_reminder after delete on public.health_insights
  for each row execute function public.health_insight_clear_reminder();

alter table public.user_settings
  add column health_check boolean not null default false;

alter type public.reminder_source add value if not exists 'health';

-- Turning the check off deletes the numbers and the advice of the caller only (RLS applies).
create or replace function public.clear_health_check()
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.health_days where user_id = (select auth.uid());
  delete from public.health_insights where user_id = (select auth.uid());
  update public.user_settings set health_check = false where user_id = (select auth.uid());
$$;
revoke execute on function public.clear_health_check() from public, anon;
grant execute on function public.clear_health_check() to authenticated;

-- Each hour at :45. The function picks the accounts whose local time is 17:45 to 17:59.
select cron.schedule('health-insight', '45 * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/health-insight',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

-- Home: the same summary as 20261110000100, plus health_check and the last two insights.
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
           health_check
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
      from (select id, on_date, weight_kg from weight_logs) w
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
    )
  );
$$;

revoke execute on function public.home_summary(date, date, date, timestamptz, timestamptz, timestamptz, date, date, timestamptz, timestamptz) from public, anon;
grant execute on function public.home_summary(date, date, date, timestamptz, timestamptz, timestamptz, date, date, timestamptz, timestamptz) to authenticated;
