-- Charli's ADV 160 maintenance checker, Nov 7, 2026. It is stricter than the owner's manual that
-- migration ...0900 used. Valve clearance, coolant, brake fluid and spark plug stay as they are.
-- Each item has one interval, so an "inspect at" value and a "replace at" value become one reminder.
with changes (item, old_km, old_months, new_km, new_months) as (
  values
    ('Engine oil',              6000::integer, 12::smallint, 1500::integer, 12::smallint),
    ('Final drive (gear) oil',  null,          24,           3000,          24),
    ('Air cleaner element',     18000,         null,         6000,          null),
    ('Brake pads / shoes wear', 6000,          12,           3000,          12),
    ('Drive belt',              24000,         null,         12000,         null),
    ('Battery',                 6000,          12,           null,          6)
),
vehicles_updated as (
  -- A vehicle that changed an interval keeps its own value.
  update public.vehicle_services vs
     set interval_km = c.new_km,
         interval_months = c.new_months
    from changes c, public.service_templates t, public.vehicle_models m
   where vs.template_id = t.id
     and t.item = c.item
     and t.model_id = m.id
     and m.make = 'Honda' and m.model = 'ADV 160'
     and vs.interval_km is not distinct from c.old_km
     and vs.interval_months is not distinct from c.old_months
  returning vs.id
)
update public.service_templates t
   set interval_km = c.new_km,
       interval_months = c.new_months
  from changes c, public.vehicle_models m
 where t.item = c.item
   and t.model_id = m.id
   and m.make = 'Honda' and m.model = 'ADV 160';

insert into public.service_templates (model_id, item, interval_km, interval_months, sort_order)
select m.id, s.item, s.interval_km, null, s.sort_order
  from public.vehicle_models m
 cross join (values
   ('CVT cleaning',      6000,  13::smallint),
   ('Steering bearings', 12000, 14::smallint)
 ) as s(item, interval_km, sort_order)
 where m.make = 'Honda' and m.model = 'ADV 160'
on conflict (model_id, item) do nothing;

-- A new vehicle copies the templates. A vehicle that already exists gets the two new items here.
insert into public.vehicle_services (user_id, vehicle_id, template_id, item, interval_km, interval_months, sort_order)
select v.user_id, v.id, t.id, t.item, t.interval_km, t.interval_months, t.sort_order
  from public.vehicles v
  join public.service_templates t on t.model_id = v.model_id
 where t.item in ('CVT cleaning', 'Steering bearings')
on conflict (vehicle_id, item) do nothing;
