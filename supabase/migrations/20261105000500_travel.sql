-- =====================================================================
-- Travel planner. You type the plans, and the app organises them.
--   trips       one row per trip, with dates and a budget.
--   trip_items  what you will do: go, stay, eat, transport or other.
--               An item with no day is an idea, and waits in Ideas.
-- An item with a day and a time gets a reminder, one hour before.
-- mark_trip_item_paid adds one Money expense. It changes no balance.
-- =====================================================================

create type public.trip_item_kind as enum ('go', 'stay', 'eat', 'transport', 'other');

create table public.trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (length(title) between 1 and 120),
  destination text,
  start_date  date not null,
  end_date    date not null,
  budget_php  numeric(12, 2) check (budget_php >= 0),
  status      text not null default 'planning' check (status in ('planning', 'booked', 'done')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create trigger trips_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.trips');

create table public.trip_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id         uuid not null references public.trips (id) on delete cascade,
  kind            public.trip_item_kind not null default 'go',
  title           text not null check (length(title) between 1 and 120),
  day             date,
  start_time      time,
  place           text,
  map_url         text,
  cost            numeric(12, 2) check (cost >= 0),
  currency        text not null default 'PHP',
  booking_ref     text,
  note            text,
  done            boolean not null default false,
  transaction_id  uuid references public.transactions (id) on delete set null,
  document_id     uuid references public.documents (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index trip_items_trip_idx on public.trip_items (trip_id);
create trigger trip_items_updated_at before update on public.trip_items
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.trip_items');

-- The trip and the linked document must be the same user's.
create or replace function public.check_trip_item_refs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from trips where id = new.trip_id and user_id = new.user_id) then
    raise exception 'trip % not found', new.trip_id using errcode = 'P0002';
  end if;
  if new.document_id is not null
     and not exists (select 1 from documents where id = new.document_id and user_id = new.user_id) then
    raise exception 'document % not found', new.document_id using errcode = 'P0002';
  end if;
  return new;
end;
$$;

create trigger trip_items_check_refs before insert or update of trip_id, document_id on public.trip_items
  for each row execute function public.check_trip_item_refs();

-- ---------------------------------------------------------------------
-- Reminder: one hour before a timed item that is not done.
-- ---------------------------------------------------------------------
alter type public.reminder_source add value if not exists 'trip_item';

create or replace function public.sync_trip_item_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
  at_time timestamptz;
begin
  if tg_op = 'DELETE' then
    delete from reminders where source_type = 'trip_item' and source_id = old.id and sent_at is null;
    return old;
  end if;

  select timezone into tz from user_settings where user_id = new.user_id;
  tz := coalesce(tz, 'Asia/Manila');
  if new.day is not null and new.start_time is not null then
    at_time := ((new.day + new.start_time) at time zone tz) - interval '1 hour';
  end if;

  if at_time is null or at_time <= now() or new.done then
    delete from reminders where source_type = 'trip_item' and source_id = new.id and sent_at is null;
    return new;
  end if;

  insert into reminders (user_id, source_type, source_id, title, body, remind_at)
  values (
    new.user_id, 'trip_item', new.id, new.title,
    coalesce(new.place, 'Starts in one hour.'), at_time
  )
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
  return new;
end;
$$;

create trigger trip_items_sync_reminder after insert or update or delete on public.trip_items
  for each row execute function public.sync_trip_item_reminder();

-- ---------------------------------------------------------------------
-- Mark as paid: one expense, the same as buy_gift. Runs as the caller.
-- ---------------------------------------------------------------------
create or replace function public.mark_trip_item_paid(p_item_id uuid, p_account_id uuid, p_amount numeric)
returns void
language plpgsql
set search_path = public
as $$
declare
  item trip_items%rowtype;
  trip_title text;
  tx uuid;
begin
  select * into item from trip_items where id = p_item_id;
  if not found then
    raise exception 'trip item % not found', p_item_id using errcode = 'P0002';
  end if;
  if item.transaction_id is not null then
    raise exception 'This item is already paid.' using errcode = 'P0001';
  end if;
  select title into trip_title from trips where id = item.trip_id;

  insert into transactions (kind, account_id, amount, occurred_on, merchant, note)
  values ('expense', p_account_id, p_amount, current_date, item.title, 'Trip: ' || trip_title)
  returning id into tx;

  update trip_items set transaction_id = tx where id = p_item_id;
end;
$$;
