-- =====================================================================
-- Seed: Honda ADV 160 as the default model.
--
-- Service intervals are intentionally NULL. Fill interval_km and
-- interval_months from the ADV 160 owner's manual before relying on the
-- due list (items with no interval show status 'no_interval').
-- Update with a new migration, e.g.:
--   update public.service_templates set interval_km = ..., interval_months = ...
--    where item = 'Engine oil' and model_id = (select id from public.vehicle_models where model = 'ADV 160');
-- =====================================================================

insert into public.vehicle_models (make, model, is_default)
values ('Honda', 'ADV 160', true);

insert into public.service_templates (model_id, item, interval_km, interval_months, sort_order)
select m.id, t.item, null, null, t.sort_order
  from public.vehicle_models m
 cross join (values
   ('Engine oil',               1),
   ('Oil strainer screen',      2),
   ('Air cleaner element',      3),
   ('Spark plug',               4),
   ('Valve clearance',          5),
   ('Drive belt',               6),
   ('Final drive (gear) oil',   7),
   ('Radiator coolant',         8),
   ('Brake fluid',              9),
   ('Brake pads / shoes wear', 10),
   ('Tires',                   11),
   ('Battery',                 12)
 ) as t(item, sort_order)
 where m.make = 'Honda' and m.model = 'ADV 160';
