-- =====================================================================
-- People and dates: birthdays, anniversaries and other yearly dates for
-- the people close to you, with gift ideas.
--   * A date is a month and day, with an optional year (for "turns 30").
--   * One reminder at 9:00 local time, one week before the next occurrence.
--     When it is sent, the next year's reminder is written.
--     Feb 29 falls on Feb 28 in other years.
--   * debts.person_id links a debt to a person. Typing a new name on a debt
--     adds that person.
--   * Buying a gift can add a Money expense (buy_gift).
-- =====================================================================

create table public.people (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(name) between 1 and 80),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index people_user_idx on public.people (user_id, lower(name));
create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.people');

create type public.person_date_kind as enum ('birthday', 'anniversary', 'other');

create table public.person_dates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id   uuid not null references public.people (id) on delete cascade,
  kind        public.person_date_kind not null default 'birthday',
  label       text,   -- for kind 'other', e.g. "Name day"
  month       smallint not null check (month between 1 and 12),
  day         smallint not null check (day between 1 and 31),
  year        smallint check (year between 1900 and 2100),
  created_at  timestamptz not null default now(),
  check (make_date(2000, month, day) is not null)   -- 2000 is a leap year, so Feb 29 is allowed
);
create index person_dates_person_idx on public.person_dates (person_id);
select public.apply_owner_rls('public.person_dates');

create table public.gift_ideas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id       uuid not null references public.people (id) on delete cascade,
  title           text not null check (length(title) between 1 and 120),
  price           numeric(12, 2) check (price > 0),
  bought_at       timestamptz,
  transaction_id  uuid references public.transactions (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index gift_ideas_person_idx on public.gift_ideas (person_id);
select public.apply_owner_rls('public.gift_ideas');

-- ---------------------------------------------------------------------
-- Debts link to a person. A typed name finds that person (same name,
-- any case) or adds them; a picked person sets the name.
-- ---------------------------------------------------------------------
alter table public.debts add column person_id uuid references public.people (id) on delete set null;

create or replace function public.link_debt_person()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  pname text;
begin
  if new.person_id is not null then
    select name into pname from people where id = new.person_id and user_id = new.user_id;
    if pname is null then
      raise exception 'person % does not belong to this user', new.person_id using errcode = '42501';
    end if;
    new.person_name := pname;
    return new;
  end if;

  select id into pid from people
   where user_id = new.user_id and lower(name) = lower(trim(new.person_name))
   order by created_at limit 1;
  if pid is null then
    insert into people (user_id, name) values (new.user_id, trim(new.person_name)) returning id into pid;
  end if;
  new.person_id := pid;
  return new;
end;
$$;

create trigger debts_link_person before insert or update of person_name, person_id on public.debts
  for each row execute function public.link_debt_person();

-- Debts made before this migration get their person too.
update public.debts set person_name = person_name where person_id is null;

-- ---------------------------------------------------------------------
-- Yearly reminders
-- ---------------------------------------------------------------------
alter type public.reminder_source add value if not exists 'person_date';

-- The first occurrence on or after `from_date`. Feb 29 is Feb 28 in other years.
create or replace function public.next_person_date(p_month int, p_day int, from_date date)
returns date
language plpgsql
immutable
as $$
declare
  y int := extract(year from from_date);
  d date;
begin
  for i in 0..1 loop
    d := case
           when p_month = 2 and p_day = 29
                and not ((y + i) % 4 = 0 and ((y + i) % 100 <> 0 or (y + i) % 400 = 0))
             then make_date(y + i, 2, 28)
           else make_date(y + i, p_month, p_day)
         end;
    if d >= from_date then return d; end if;
  end loop;
  return d;
end;
$$;

create or replace function public.sync_person_date_reminder_for(p_id uuid, from_date date default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pd person_dates%rowtype;
  who text;
  tz text;
  today date;
  occ date;
  what text;
  at timestamptz;
begin
  select * into pd from person_dates where id = p_id;
  if not found then
    delete from reminders where source_type = 'person_date' and source_id = p_id and sent_at is null;
    return;
  end if;

  select name into who from people where id = pd.person_id;
  select timezone into tz from user_settings where user_id = pd.user_id;
  tz := coalesce(tz, 'Asia/Manila');
  today := (now() at time zone tz)::date;
  occ := next_person_date(pd.month, pd.day, coalesce(from_date, today));
  what := case pd.kind when 'birthday' then 'birthday' when 'anniversary' then 'anniversary'
                       else coalesce(nullif(trim(pd.label), ''), 'date') end;
  -- One week before; when that has passed already, as soon as possible.
  at := greatest(((occ - 7)::timestamp + time '09:00') at time zone tz, now());

  insert into reminders (user_id, source_type, source_id, title, body, remind_at)
  values (
    pd.user_id, 'person_date', pd.id,
    who || '''s ' || what || ' is ' || to_char(occ, 'Mon FMDD'),
    case when pd.year is not null and pd.kind in ('birthday', 'anniversary')
         then case pd.kind when 'birthday' then 'Turns ' else 'Years: ' end
              || (extract(year from occ)::int - pd.year)::text || '. '
         else '' end || 'Time to plan a gift.',
    at
  )
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
end;
$$;
revoke execute on function public.sync_person_date_reminder_for(uuid, date) from public, anon, authenticated;

create or replace function public.sync_person_date_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from reminders where source_type = 'person_date' and source_id = old.id and sent_at is null;
    return old;
  end if;
  perform sync_person_date_reminder_for(new.id);
  return new;
end;
$$;

create trigger person_dates_sync_reminder after insert or update or delete on public.person_dates
  for each row execute function public.sync_person_date_reminder();

-- A renamed person gets new reminder titles.
create or replace function public.sync_person_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select id from person_dates where person_id = new.id loop
    perform sync_person_date_reminder_for(r.id);
  end loop;
  return new;
end;
$$;

create trigger people_sync_reminders after update of name on public.people
  for each row execute function public.sync_person_reminders();

-- When a date's reminder is sent, write next year's. Sent at most a week
-- before the date, so 8 days later is past this occurrence.
create or replace function public.schedule_next_person_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
begin
  if new.source_type = 'person_date' and old.sent_at is null and new.sent_at is not null then
    select timezone into tz from user_settings where user_id = new.user_id;
    perform sync_person_date_reminder_for(new.source_id, (now() at time zone coalesce(tz, 'Asia/Manila'))::date + 8);
  end if;
  return new;
end;
$$;

create trigger reminders_next_person_date after update of sent_at on public.reminders
  for each row execute function public.schedule_next_person_date();

-- ---------------------------------------------------------------------
-- Buy a gift: mark it bought and add the Money expense. Runs as the caller.
-- ---------------------------------------------------------------------
create or replace function public.buy_gift(p_gift_id uuid, p_account_id uuid, p_amount numeric)
returns void
language plpgsql
set search_path = public
as $$
declare
  g gift_ideas%rowtype;
  who text;
  tx uuid;
begin
  select * into g from gift_ideas where id = p_gift_id;
  if not found then
    raise exception 'gift % not found', p_gift_id using errcode = 'P0002';
  end if;
  select name into who from people where id = g.person_id;

  insert into transactions (kind, account_id, amount, occurred_on, merchant, note)
  values ('expense', p_account_id, p_amount, current_date, g.title, 'Gift for ' || who)
  returning id into tx;

  update gift_ideas set bought_at = now(), transaction_id = tx, price = p_amount where id = p_gift_id;
end;
$$;
