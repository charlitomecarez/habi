-- v1.5.0 milestone 2: faster screens.
--   1. An index on each foreign key that has none (36, from the performance advisors).
--   2. One select policy on feedback and one on voice_messages, instead of two each.
--   3. home_summary(): every read on Home in one request. Security invoker, so RLS of the caller applies.
-- No row changes. The v1.4.0 APK does not call home_summary, and the joined policies return the same rows.

-- 1. Foreign key indexes.
create index if not exists debt_payments_account_id_idx on public.debt_payments (account_id);
create index if not exists debt_payments_transaction_id_idx on public.debt_payments (transaction_id);
create index if not exists debt_payments_user_id_idx on public.debt_payments (user_id);
create index if not exists debts_person_id_idx on public.debts (person_id);
create index if not exists documents_vehicle_id_idx on public.documents (vehicle_id);
create index if not exists feedback_user_id_idx on public.feedback (user_id);
create index if not exists fuel_logs_odometer_log_id_idx on public.fuel_logs (odometer_log_id);
create index if not exists fuel_logs_transaction_id_idx on public.fuel_logs (transaction_id);
create index if not exists fuel_logs_user_id_idx on public.fuel_logs (user_id);
create index if not exists gift_ideas_transaction_id_idx on public.gift_ideas (transaction_id);
create index if not exists gift_ideas_user_id_idx on public.gift_ideas (user_id);
create index if not exists inventory_items_location_id_idx on public.inventory_items (location_id);
create index if not exists inventory_locations_parent_id_idx on public.inventory_locations (parent_id);
create index if not exists medicines_user_id_idx on public.medicines (user_id);
create index if not exists money_budgets_category_id_idx on public.money_budgets (category_id);
create index if not exists odometer_logs_user_id_idx on public.odometer_logs (user_id);
create index if not exists person_dates_user_id_idx on public.person_dates (user_id);
create index if not exists recurring_transactions_account_id_idx on public.recurring_transactions (account_id);
create index if not exists recurring_transactions_category_id_idx on public.recurring_transactions (category_id);
create index if not exists savings_contributions_user_id_idx on public.savings_contributions (user_id);
create index if not exists savings_goals_account_id_idx on public.savings_goals (account_id);
create index if not exists savings_goals_user_id_idx on public.savings_goals (user_id);
create index if not exists service_logs_user_id_idx on public.service_logs (user_id);
create index if not exists subscriptions_account_id_idx on public.subscriptions (account_id);
create index if not exists subscriptions_category_id_idx on public.subscriptions (category_id);
create index if not exists transactions_subscription_id_idx on public.transactions (subscription_id);
create index if not exists trip_items_document_id_idx on public.trip_items (document_id);
create index if not exists trip_items_transaction_id_idx on public.trip_items (transaction_id);
create index if not exists trip_items_user_id_idx on public.trip_items (user_id);
create index if not exists trips_user_id_idx on public.trips (user_id);
create index if not exists vehicle_services_template_id_idx on public.vehicle_services (template_id);
create index if not exists vehicle_services_user_id_idx on public.vehicle_services (user_id);
create index if not exists vehicles_model_id_idx on public.vehicles (model_id);
create index if not exists workout_exercises_user_id_idx on public.workout_exercises (user_id);
create index if not exists workout_plans_user_id_idx on public.workout_plans (user_id);
create index if not exists workout_sets_user_id_idx on public.workout_sets (user_id);

-- 2. One select policy each. The rules are the same as before, joined with "or".
drop policy "owner_select" on public.feedback;
drop policy "admin_select" on public.feedback;
create policy "select_own_or_admin" on public.feedback for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()))
  );

drop policy "owner_select" on public.voice_messages;
drop policy "recipient_select" on public.voice_messages;
create policy "select_sent_or_received" on public.voice_messages for select to authenticated
  using (
    user_id = (select auth.uid())
    or (recipient_id = (select auth.uid()) and status = 'ready')
  );

-- 3. Home in one request. Each key holds the rows that the module's own query returns, with the
-- same columns and order, so the app fills each module's cache from it. The phone sends its own
-- dates, because "today" and "this month" are local to the phone.
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
    select timezone, digest_enabled, digest_hour, home_shortcuts, ulam_limit, ulam_avoid, followed_teams, hidden_modules
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
