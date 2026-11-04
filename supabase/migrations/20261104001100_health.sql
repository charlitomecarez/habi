-- =====================================================================
-- Health: medicines with dose reminders, doctor visits with encrypted lab
-- photos, and a weight log.
--   * medicines: times of day, start and optional end date.
--   * medicine_doses: one row per scheduled dose, kept two days ahead by
--     an hourly job. Each pending dose has its own push reminder; Taken or
--     Skipped removes it. The daily digest lists today's doses.
--   * health_visits.photo_paths: files encrypted on the phone with the
--     Vault key (lib/secure-photos.ts). Supabase only stores ciphertext.
-- =====================================================================

create table public.medicines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(name) between 1 and 120),
  dose        text not null default '',          -- e.g. "500 mg, 1 tablet"
  times       time[] not null default '{}',
  start_on    date not null default current_date,
  end_on      date,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_on is null or end_on >= start_on)
);
create trigger medicines_updated_at before update on public.medicines
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.medicines');

create type public.dose_status as enum ('pending', 'taken', 'skipped');

create table public.medicine_doses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  medicine_id    uuid not null references public.medicines (id) on delete cascade,
  medicine_name  text not null,
  dose           text not null default '',
  scheduled_at   timestamptz not null,
  status         public.dose_status not null default 'pending',
  marked_at      timestamptz,
  created_at     timestamptz not null default now(),
  unique (medicine_id, scheduled_at)
);
create index medicine_doses_user_time_idx on public.medicine_doses (user_id, scheduled_at);
select public.apply_owner_rls('public.medicine_doses');

create table public.health_visits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visited_on   date not null default current_date,
  doctor       text not null default '',
  reason       text not null default '',
  notes        text,
  photo_paths  text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index health_visits_user_idx on public.health_visits (user_id, visited_on desc);
create trigger health_visits_updated_at before update on public.health_visits
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.health_visits');

create table public.weight_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  on_date     date not null default current_date,
  weight_kg   numeric(5, 1) not null check (weight_kg between 20 and 400),
  created_at  timestamptz not null default now(),
  unique (user_id, on_date)
);
select public.apply_owner_rls('public.weight_logs');

-- ---------------------------------------------------------------------
-- Doses and their reminders
-- ---------------------------------------------------------------------
alter type public.reminder_source add value if not exists 'medicine';

-- Writes the doses of one medicine for today and the next two days (local time).
create or replace function public.fill_medicine_doses(p_medicine_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m medicines%rowtype;
  tz text;
  d date;
  t time;
  at timestamptz;
begin
  select * into m from medicines where id = p_medicine_id;
  if not found then return; end if;
  select timezone into tz from user_settings where user_id = m.user_id;
  tz := coalesce(tz, 'Asia/Manila');

  for i in 0..2 loop
    d := (now() at time zone tz)::date + i;
    continue when d < m.start_on or (m.end_on is not null and d > m.end_on);
    foreach t in array m.times loop
      at := (d::timestamp + t) at time zone tz;
      continue when at < now() - interval '1 hour';
      insert into medicine_doses (user_id, medicine_id, medicine_name, dose, scheduled_at)
      values (m.user_id, m.id, m.name, m.dose, at)
      on conflict (medicine_id, scheduled_at) do nothing;
    end loop;
  end loop;
end;
$$;
revoke execute on function public.fill_medicine_doses(uuid) from public, anon, authenticated;

-- A changed medicine drops its future pending doses and writes them again.
create or replace function public.medicine_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    delete from medicine_doses where medicine_id = new.id and status = 'pending' and scheduled_at > now();
  end if;
  perform fill_medicine_doses(new.id);
  return new;
end;
$$;

create trigger medicines_fill_doses after insert or update of name, dose, times, start_on, end_on on public.medicines
  for each row execute function public.medicine_changed();

-- One reminder per pending dose; Taken, Skipped or deleting removes it.
create or replace function public.sync_dose_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or new.status <> 'pending' then
    delete from reminders where source_type = 'medicine' and source_id = coalesce(new.id, old.id) and sent_at is null;
    return coalesce(new, old);
  end if;
  insert into reminders (user_id, source_type, source_id, title, body, remind_at)
  values (new.user_id, 'medicine', new.id, 'Take ' || new.medicine_name,
          coalesce(nullif(new.dose, ''), 'Mark it taken in my-app.'), new.scheduled_at)
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
  return new;
end;
$$;

create trigger medicine_doses_sync_reminder after insert or update of status or delete on public.medicine_doses
  for each row execute function public.sync_dose_reminder();

-- Hourly: keep every active medicine two days ahead.
create or replace function public.fill_all_medicine_doses()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select id from medicines where end_on is null or end_on >= current_date - 1 loop
    perform fill_medicine_doses(r.id);
  end loop;
end;
$$;
revoke execute on function public.fill_all_medicine_doses() from public, anon, authenticated;

select cron.schedule('fill-medicine-doses', '10 * * * *', $job$ select public.fill_all_medicine_doses(); $job$);
