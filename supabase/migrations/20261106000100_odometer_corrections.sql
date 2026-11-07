-- Lets the app lower the odometer to fix a wrong reading. Only a log with is_correction can lower it,
-- so an old fuel or service entry never does.
alter table public.odometer_logs
  add column is_correction boolean not null default false;

create or replace function public.on_odometer_logged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_correction then
    update vehicles set current_odometer_km = new.odometer_km where id = new.vehicle_id;

    -- A lower reading can end "overdue". Stop each reminder that is no longer true.
    delete from reminders r
     using vehicle_service_due d
     where d.vehicle_id = new.vehicle_id
       and d.status <> 'overdue'
       and r.source_type = 'vehicle_service'
       and r.source_id = d.vehicle_service_id
       and r.sent_at is null;
  else
    update vehicles
       set current_odometer_km = greatest(current_odometer_km, new.odometer_km)
     where id = new.vehicle_id;
  end if;

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
