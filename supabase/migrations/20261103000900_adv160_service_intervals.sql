-- =====================================================================
-- Honda ADV 160 service intervals.
--
-- Source: Honda ADV160 owner's manual, Maintenance Schedule (pp. 86-87),
-- published by Boon Siew Honda:
--   https://boonsiewhonda.com.my/wp-content/uploads/2023/08/ADV160-MS-ENG.pdf
--
-- Each item uses the interval of its main action (replace, clean, or
-- inspect when the manual has no replace). "Annual check" = 12 months.
-- "Regular replace" years become months.
-- =====================================================================

with intervals (item, interval_km, interval_months) as (
  values
    ('Engine oil',               6000, 12),  -- replace every 6,000 km + annual
    ('Oil strainer screen',     12000, null), -- clean at 6, 18, 30 thousand km
    ('Air cleaner element',     18000, null), -- replace every 18,000 km
    ('Spark plug',              12000, null), -- replace every 12,000 km
    ('Valve clearance',          6000, null), -- inspect every 6,000 km
    ('Drive belt',              24000, null), -- replace at 24,000 km
    ('Final drive (gear) oil',   null, 24),   -- replace every 2 years
    ('Radiator coolant',         null, 36),   -- replace every 3 years
    ('Brake fluid',              null, 24),   -- replace every 2 years
    ('Brake pads / shoes wear',  6000, 12),   -- inspect every 6,000 km + annual
    ('Tires',                    6000, 12),   -- inspect every 6,000 km + annual
    ('Battery',                  6000, 12)    -- inspect every 6,000 km + annual
)
update public.service_templates t
   set interval_km = i.interval_km::integer,
       interval_months = i.interval_months::smallint
  from intervals i, public.vehicle_models m
 where t.item = i.item
   and t.model_id = m.id
   and m.make = 'Honda' and m.model = 'ADV 160';

-- Vehicles added before this migration copied the empty intervals.
-- Fill only the rows that are still empty, so a custom interval stays.
update public.vehicle_services vs
   set interval_km = t.interval_km,
       interval_months = t.interval_months
  from public.service_templates t
 where vs.template_id = t.id
   and vs.interval_km is null
   and vs.interval_months is null;
