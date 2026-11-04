-- =====================================================================
-- Habits: daily, on set weekdays, or a number of times a week.
--   * habit_checks: one per habit per day (unique), in local dates.
--   * A push reminder at remind_time on the next day the habit is due and
--     not done. A "times a week" habit stops reminding once the week's
--     count is done. Weeks run Monday to Sunday.
--   * After each reminder is sent, and after each tick, the next one is
--     written.
-- =====================================================================

create type public.habit_schedule as enum ('daily', 'weekdays', 'times_per_week');

create table public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (length(name) between 1 and 80),
  schedule        public.habit_schedule not null default 'daily',
  weekdays        smallint[] not null default '{}',   -- 0 Sunday .. 6 Saturday, for 'weekdays'
  times_per_week  smallint check (times_per_week between 1 and 7),
  remind_time     time,
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (schedule <> 'weekdays' or cardinality(weekdays) > 0),
  check (schedule <> 'times_per_week' or times_per_week is not null)
);
create index habits_user_idx on public.habits (user_id) where not archived;
create trigger habits_updated_at before update on public.habits
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.habits');

create table public.habit_checks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id    uuid not null references public.habits (id) on delete cascade,
  on_date     date not null,
  created_at  timestamptz not null default now(),
  unique (habit_id, on_date)
);
create index habit_checks_user_date_idx on public.habit_checks (user_id, on_date);
select public.apply_owner_rls('public.habit_checks');

-- ---------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------
alter type public.reminder_source add value if not exists 'habit';

create or replace function public.sync_habit_reminder_for(p_habit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h habits%rowtype;
  tz text;
  local_now timestamp;
  d date;
  due boolean;
  week_count int;
begin
  select * into h from habits where id = p_habit_id;
  if not found or h.archived or h.remind_time is null then
    delete from reminders where source_type = 'habit' and source_id = p_habit_id and sent_at is null;
    return;
  end if;

  select timezone into tz from user_settings where user_id = h.user_id;
  tz := coalesce(tz, 'Asia/Manila');
  local_now := now() at time zone tz;

  for i in 0..8 loop
    d := local_now::date + i;
    -- Today only counts while the reminder time is still ahead.
    continue when i = 0 and local_now::time >= h.remind_time;
    continue when exists (select 1 from habit_checks where habit_id = h.id and on_date = d);
    if h.schedule = 'daily' then
      due := true;
    elsif h.schedule = 'weekdays' then
      due := extract(dow from d)::smallint = any (h.weekdays);
    else
      select count(*) into week_count from habit_checks
       where habit_id = h.id and on_date >= date_trunc('week', d)::date and on_date < date_trunc('week', d)::date + 7;
      due := week_count < h.times_per_week;
    end if;
    if due then
      insert into reminders (user_id, source_type, source_id, title, body, remind_at)
      values (h.user_id, 'habit', h.id, h.name,
              case when h.schedule = 'times_per_week'
                   then 'Tick it in my-app when you are done. ' || h.times_per_week || ' times this week.'
                   else 'Tick it in my-app when you are done.' end,
              (d::timestamp + h.remind_time) at time zone tz)
      on conflict (source_type, source_id) where sent_at is null and source_id is not null
      do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
      return;
    end if;
  end loop;
  delete from reminders where source_type = 'habit' and source_id = p_habit_id and sent_at is null;
end;
$$;
revoke execute on function public.sync_habit_reminder_for(uuid) from public, anon, authenticated;

create or replace function public.sync_habit_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'habits' then
    if tg_op = 'DELETE' then
      delete from reminders where source_type = 'habit' and source_id = old.id and sent_at is null;
      return old;
    end if;
    perform sync_habit_reminder_for(new.id);
    return new;
  end if;
  perform sync_habit_reminder_for(coalesce(new.habit_id, old.habit_id));
  return coalesce(new, old);
end;
$$;

create trigger habits_sync_reminder after insert or update or delete on public.habits
  for each row execute function public.sync_habit_reminder();
create trigger habit_checks_sync_reminder after insert or delete on public.habit_checks
  for each row execute function public.sync_habit_reminder();

create or replace function public.schedule_next_habit_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_type = 'habit' and old.sent_at is null and new.sent_at is not null then
    perform sync_habit_reminder_for(new.source_id);
  end if;
  return new;
end;
$$;

create trigger reminders_next_habit after update of sent_at on public.reminders
  for each row execute function public.schedule_next_habit_reminder();
