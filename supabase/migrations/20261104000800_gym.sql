-- =====================================================================
-- Gym. The plan: workout_plans (one per workout day, e.g. "Upper body",
-- with its own weekdays) and workout_exercises (sets, reps, optional
-- weight). What you did: workout_sessions (one per plan per day) and
-- workout_sets (each ticked set, with the reps and weight you did; the
-- plan does not change).
-- A push notification at remind_time on each gym day until you train.
-- No email: the daily digest does not read these tables.
-- =====================================================================

create table public.workout_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (length(name) between 1 and 80),
  weekdays     smallint[] not null default '{}',   -- 0 Sunday .. 6 Saturday
  remind_time  time,
  sort_order   smallint not null default 0,
  archived     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger workout_plans_updated_at before update on public.workout_plans
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.workout_plans');

create table public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id     uuid not null references public.workout_plans (id) on delete cascade,
  name        text not null check (length(name) between 1 and 80),
  sets        smallint not null default 3 check (sets between 1 and 20),
  reps        smallint not null default 10 check (reps between 1 and 200),
  weight_kg   numeric(6, 2) check (weight_kg >= 0),
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);
create index workout_exercises_plan_idx on public.workout_exercises (plan_id, sort_order);
select public.apply_owner_rls('public.workout_exercises');

create table public.workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id     uuid references public.workout_plans (id) on delete set null,
  plan_name   text not null,
  on_date     date not null,
  created_at  timestamptz not null default now(),
  unique (plan_id, on_date)
);
create index workout_sessions_user_date_idx on public.workout_sessions (user_id, on_date);
select public.apply_owner_rls('public.workout_sessions');

create table public.workout_sets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id     uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id    uuid references public.workout_exercises (id) on delete set null,
  exercise_name  text not null,
  set_number     smallint not null check (set_number >= 1),
  reps           smallint not null check (reps between 0 and 200),
  weight_kg      numeric(6, 2) check (weight_kg >= 0),
  created_at     timestamptz not null default now(),
  unique (session_id, exercise_id, set_number)
);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id, created_at desc);
select public.apply_owner_rls('public.workout_sets');

-- ---------------------------------------------------------------------
-- Gym-day push reminders
-- ---------------------------------------------------------------------
alter type public.reminder_source add value if not exists 'workout';

create or replace function public.sync_workout_reminder_for(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p workout_plans%rowtype;
  tz text;
  local_now timestamp;
  d date;
  n int;
begin
  select * into p from workout_plans where id = p_plan_id;
  if not found or p.archived or p.remind_time is null or cardinality(p.weekdays) = 0 then
    delete from reminders where source_type = 'workout' and source_id = p_plan_id and sent_at is null;
    return;
  end if;
  select timezone into tz from user_settings where user_id = p.user_id;
  tz := coalesce(tz, 'Asia/Manila');
  local_now := now() at time zone tz;

  for i in 0..7 loop
    d := local_now::date + i;
    continue when i = 0 and local_now::time >= p.remind_time;
    continue when not (extract(dow from d)::smallint = any (p.weekdays));
    continue when exists (select 1 from workout_sessions where plan_id = p.id and on_date = d);
    select count(*) into n from workout_exercises where plan_id = p.id;
    insert into reminders (user_id, source_type, source_id, title, body, remind_at)
    values (p.user_id, 'workout', p.id, 'Gym day: ' || p.name,
            n || ' ' || case when n = 1 then 'exercise' else 'exercises' end || ' on the plan.',
            (d::timestamp + p.remind_time) at time zone tz)
    on conflict (source_type, source_id) where sent_at is null and source_id is not null
    do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
    return;
  end loop;
end;
$$;
revoke execute on function public.sync_workout_reminder_for(uuid) from public, anon, authenticated;

create or replace function public.sync_workout_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'workout_plans' then
    if tg_op = 'DELETE' then
      delete from reminders where source_type = 'workout' and source_id = old.id and sent_at is null;
      return old;
    end if;
    perform sync_workout_reminder_for(new.id);
    return new;
  end if;
  if coalesce(new.plan_id, old.plan_id) is not null then
    perform sync_workout_reminder_for(coalesce(new.plan_id, old.plan_id));
  end if;
  return coalesce(new, old);
end;
$$;

create trigger workout_plans_sync_reminder after insert or update or delete on public.workout_plans
  for each row execute function public.sync_workout_reminder();
create trigger workout_sessions_sync_reminder after insert or delete on public.workout_sessions
  for each row execute function public.sync_workout_reminder();

create or replace function public.schedule_next_workout_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_type = 'workout' and old.sent_at is null and new.sent_at is not null then
    perform sync_workout_reminder_for(new.source_id);
  end if;
  return new;
end;
$$;

create trigger reminders_next_workout after update of sent_at on public.reminders
  for each row execute function public.schedule_next_workout_reminder();
