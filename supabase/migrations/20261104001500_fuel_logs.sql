-- =====================================================================
-- Fuel log: each fill-up with litres, price and odometer.
-- log_fuel() writes the odometer reading (which updates the vehicle and
-- its service reminders), the Money expense and the fuel_logs row in one
-- step. km per litre counts between two full-tank fill-ups (in the app).
-- Deleting a fill-up deletes its expense; the odometer reading stays.
-- =====================================================================

create table public.fuel_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_id       uuid not null references public.vehicles (id) on delete cascade,
  filled_on        date not null default current_date,
  litres           numeric(6, 2) not null check (litres > 0),
  price_per_litre  numeric(7, 2) not null check (price_per_litre > 0),
  total            numeric(10, 2) not null check (total > 0),
  full_tank        boolean not null default true,
  odometer_km      integer not null check (odometer_km >= 0),
  station          text,
  odometer_log_id  uuid references public.odometer_logs (id) on delete set null,
  transaction_id   uuid references public.transactions (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index fuel_logs_vehicle_idx on public.fuel_logs (vehicle_id, odometer_km);
select public.apply_owner_rls('public.fuel_logs');

create or replace function public.log_fuel(
  p_vehicle_id uuid, p_filled_on date, p_litres numeric, p_price_per_litre numeric,
  p_odometer_km integer, p_full_tank boolean, p_station text, p_account_id uuid, p_category_id uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  odo uuid;
  tx uuid;
  fuel uuid;
  total numeric := round(p_litres * p_price_per_litre, 2);
begin
  insert into odometer_logs (vehicle_id, odometer_km, logged_at, note)
  values (p_vehicle_id, p_odometer_km, (p_filled_on::timestamp + time '12:00'), 'Fuel fill-up')
  returning id into odo;

  insert into transactions (kind, account_id, category_id, amount, occurred_on, merchant, note)
  values ('expense', p_account_id, p_category_id, total, p_filled_on,
          coalesce(nullif(trim(p_station), ''), 'Fuel'),
          to_char(p_litres, 'FM990.00') || ' L at ₱' || to_char(p_price_per_litre, 'FM990.00'))
  returning id into tx;

  insert into fuel_logs (vehicle_id, filled_on, litres, price_per_litre, total, full_tank, odometer_km, station, odometer_log_id, transaction_id)
  values (p_vehicle_id, p_filled_on, p_litres, p_price_per_litre, total, p_full_tank, p_odometer_km, nullif(trim(p_station), ''), odo, tx)
  returning id into fuel;
  return fuel;
end;
$$;

create or replace function public.delete_fuel_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.transaction_id is not null then
    delete from transactions where id = old.transaction_id and user_id = old.user_id;
  end if;
  return old;
end;
$$;

create trigger fuel_logs_delete_transaction after delete on public.fuel_logs
  for each row execute function public.delete_fuel_transaction();
