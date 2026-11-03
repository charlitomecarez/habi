-- =====================================================================
-- Vehicle maintenance
--   vehicle_models + service_templates : shared reference data (read-only)
--   vehicles, vehicle_services, odometer_logs, service_logs : per user
--   vehicle_service_due (view) : what needs servicing now
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shared reference data
-- ---------------------------------------------------------------------
create table public.vehicle_models (
  id          uuid primary key default gen_random_uuid(),
  make        text not null,
  model       text not null,
  is_default  boolean not null default false,
  unique (make, model)
);
-- Only one default model.
create unique index vehicle_models_one_default on public.vehicle_models (is_default) where is_default;

create table public.service_templates (
  id               uuid primary key default gen_random_uuid(),
  model_id         uuid not null references public.vehicle_models (id) on delete cascade,
  item             text not null,
  interval_km      integer check (interval_km > 0),
  interval_months  smallint check (interval_months > 0),
  notes            text,
  sort_order       smallint not null default 0,
  unique (model_id, item)
);

alter table public.vehicle_models enable row level security;
alter table public.service_templates enable row level security;
create policy "read_all" on public.vehicle_models for select to authenticated using (true);
create policy "read_all" on public.service_templates for select to authenticated using (true);
-- No insert/update/delete policies: reference data changes only via migrations.

-- ---------------------------------------------------------------------
-- Per-user vehicles
-- ---------------------------------------------------------------------
create table public.vehicles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  model_id             uuid references public.vehicle_models (id) on delete set null,
  make                 text not null,
  model                text not null,
  nickname             text,
  plate_number         text,
  current_odometer_km  integer not null default 0 check (current_odometer_km >= 0),
  is_primary           boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index vehicles_user_idx on public.vehicles (user_id);
create unique index vehicles_one_primary_per_user on public.vehicles (user_id) where is_primary;
create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.vehicles');

-- Each vehicle gets its own copy of the service schedule so intervals can be
-- customised per vehicle without touching the shared templates.
create table public.vehicle_services (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_id       uuid not null references public.vehicles (id) on delete cascade,
  template_id      uuid references public.service_templates (id) on delete set null,
  item             text not null,
  interval_km      integer check (interval_km > 0),
  interval_months  smallint check (interval_months > 0),
  is_active        boolean not null default true,
  sort_order       smallint not null default 0,
  created_at       timestamptz not null default now(),
  unique (vehicle_id, item)
);
create index vehicle_services_vehicle_idx on public.vehicle_services (vehicle_id);
select public.apply_owner_rls('public.vehicle_services');

create table public.odometer_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_id   uuid not null references public.vehicles (id) on delete cascade,
  odometer_km  integer not null check (odometer_km >= 0),
  logged_at    timestamptz not null default now(),
  note         text
);
create index odometer_logs_vehicle_idx on public.odometer_logs (vehicle_id, logged_at desc);
select public.apply_owner_rls('public.odometer_logs');

create table public.service_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_id          uuid not null references public.vehicles (id) on delete cascade,
  vehicle_service_id  uuid references public.vehicle_services (id) on delete set null,
  odometer_km         integer not null check (odometer_km >= 0),
  serviced_on         date not null default current_date,
  cost                numeric(10, 2) check (cost >= 0),
  shop                text,
  notes               text,
  receipt_path        text,  -- path in the user-files storage bucket
  created_at          timestamptz not null default now()
);
create index service_logs_service_idx on public.service_logs (vehicle_service_id, serviced_on desc);
create index service_logs_vehicle_idx on public.service_logs (vehicle_id, serviced_on desc);
select public.apply_owner_rls('public.service_logs');

-- ---------------------------------------------------------------------
-- Integrity: child rows must belong to the same user as their vehicle.
-- RLS checks user_id on each row, but not that the referenced vehicle is
-- also yours; this closes that gap.
-- ---------------------------------------------------------------------
create or replace function public.check_vehicle_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from vehicles v where v.id = new.vehicle_id and v.user_id = new.user_id) then
    raise exception 'vehicle % does not belong to this user', new.vehicle_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger vehicle_services_owner before insert or update on public.vehicle_services
  for each row execute function public.check_vehicle_owner();
create trigger odometer_logs_owner before insert or update on public.odometer_logs
  for each row execute function public.check_vehicle_owner();
create trigger service_logs_owner before insert or update on public.service_logs
  for each row execute function public.check_vehicle_owner();

-- ---------------------------------------------------------------------
-- New vehicle: fill model_id from the default model if none was given,
-- then copy that model's templates into vehicle_services.
-- ---------------------------------------------------------------------
create or replace function public.vehicle_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m vehicle_models;
begin
  if new.model_id is null and new.make is null and new.model is null then
    select * into m from vehicle_models where is_default limit 1;
    if found then
      new.model_id := m.id;
      new.make := m.make;
      new.model := m.model;
    end if;
  end if;
  return new;
end;
$$;

create trigger vehicles_defaults before insert on public.vehicles
  for each row execute function public.vehicle_defaults();

create or replace function public.copy_service_templates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.model_id is not null then
    insert into vehicle_services (user_id, vehicle_id, template_id, item, interval_km, interval_months, sort_order)
    select new.user_id, new.id, t.id, t.item, t.interval_km, t.interval_months, t.sort_order
      from service_templates t
     where t.model_id = new.model_id
    on conflict (vehicle_id, item) do nothing;
  end if;
  return new;
end;
$$;

create trigger vehicles_copy_templates after insert on public.vehicles
  for each row execute function public.copy_service_templates();

-- ---------------------------------------------------------------------
-- What's due. security_invoker = true makes the view respect the caller's
-- RLS, so you only ever see your own vehicles.
--
-- Rules: next due = last service (or 0 km / vehicle creation date if never
-- serviced) + interval. Whichever of km or months comes first wins.
-- 'due_soon' = within 500 km or 14 days.
-- ---------------------------------------------------------------------
create or replace view public.vehicle_service_due
with (security_invoker = true)
as
with last_service as (
  select distinct on (sl.vehicle_service_id)
         sl.vehicle_service_id, sl.odometer_km, sl.serviced_on
    from public.service_logs sl
   where sl.vehicle_service_id is not null
   order by sl.vehicle_service_id, sl.serviced_on desc, sl.odometer_km desc
),
calc as (
  select vs.id                  as vehicle_service_id,
         vs.user_id,
         vs.vehicle_id,
         v.nickname,
         v.make,
         v.model,
         vs.item,
         vs.interval_km,
         vs.interval_months,
         vs.sort_order,
         v.current_odometer_km,
         ls.odometer_km         as last_service_km,
         ls.serviced_on         as last_serviced_on,
         case when vs.interval_km is not null
              then coalesce(ls.odometer_km, 0) + vs.interval_km end              as next_due_km,
         case when vs.interval_months is not null
              then (coalesce(ls.serviced_on, v.created_at::date)
                    + make_interval(months => vs.interval_months))::date end     as next_due_on
    from public.vehicle_services vs
    join public.vehicles v on v.id = vs.vehicle_id
    left join last_service ls on ls.vehicle_service_id = vs.id
   where vs.is_active
)
select calc.*,
       next_due_km - current_odometer_km  as km_remaining,
       next_due_on - current_date         as days_remaining,
       case
         when (next_due_km is not null and current_odometer_km >= next_due_km)
           or (next_due_on is not null and current_date >= next_due_on)        then 'overdue'
         when (next_due_km is not null and next_due_km - current_odometer_km <= 500)
           or (next_due_on is not null and next_due_on - current_date <= 14)    then 'due_soon'
         when next_due_km is null and next_due_on is null                       then 'no_interval'
         else 'ok'
       end as status
  from calc;

-- ---------------------------------------------------------------------
-- New odometer reading: bump the vehicle's odometer (never backwards),
-- then queue a reminder for anything that just became overdue.
-- ---------------------------------------------------------------------
create or replace function public.on_odometer_logged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update vehicles
     set current_odometer_km = greatest(current_odometer_km, new.odometer_km)
   where id = new.vehicle_id;

  insert into reminders (user_id, source_type, source_id, title, body, remind_at)
  select d.user_id,
         'vehicle_service',
         d.vehicle_service_id,
         coalesce(d.nickname, d.make || ' ' || d.model) || ': ' || d.item || ' due',
         case when d.next_due_km is not null
              then 'Due at ' || d.next_due_km || ' km (now ' || d.current_odometer_km || ' km)'
              else 'Due since ' || d.next_due_on end,
         now()
    from vehicle_service_due d
   where d.vehicle_id = new.vehicle_id
     and d.status = 'overdue'
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do nothing;

  return new;
end;
$$;

create trigger odometer_logs_after_insert after insert on public.odometer_logs
  for each row execute function public.on_odometer_logged();

-- Logging a service clears its pending reminder.
create or replace function public.on_service_logged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vehicle_service_id is not null then
    delete from reminders
     where source_type = 'vehicle_service'
       and source_id = new.vehicle_service_id
       and sent_at is null;
  end if;
  update vehicles
     set current_odometer_km = greatest(current_odometer_km, new.odometer_km)
   where id = new.vehicle_id;
  return new;
end;
$$;

create trigger service_logs_after_insert after insert on public.service_logs
  for each row execute function public.on_service_logged();
