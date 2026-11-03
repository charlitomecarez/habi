-- =====================================================================
-- Room inventory
--   inventory_locations : nested places (room > shelf > box)
--   inventory_items     : things, each in one location
-- =====================================================================

create table public.inventory_locations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id   uuid references public.inventory_locations (id) on delete set null,
  name        text not null check (length(name) between 1 and 120),
  qr_code     text unique,           -- optional label printed on a box
  created_at  timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create index inventory_locations_user_idx on public.inventory_locations (user_id, parent_id);
select public.apply_owner_rls('public.inventory_locations');

create table public.inventory_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  location_id  uuid references public.inventory_locations (id) on delete set null,
  name         text not null check (length(name) between 1 and 200),
  category     text,
  quantity     integer not null default 1 check (quantity >= 0),
  notes        text,
  photo_path   text,                  -- path in the user-files storage bucket
  acquired_on  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index inventory_items_user_idx on public.inventory_items (user_id, location_id);
create index inventory_items_name_search on public.inventory_items
  using gin (to_tsvector('simple', name || ' ' || coalesce(category, '') || ' ' || coalesce(notes, '')));
create trigger inventory_items_updated_at before update on public.inventory_items
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.inventory_items');

-- Locations referenced by a row must belong to the same user.
create or replace function public.check_location_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- to_jsonb lets one function serve both tables (different column names).
  loc uuid := (to_jsonb(new) ->> case tg_table_name when 'inventory_items' then 'location_id' else 'parent_id' end)::uuid;
begin
  if loc is not null
     and not exists (select 1 from inventory_locations l where l.id = loc and l.user_id = new.user_id) then
    raise exception 'location % does not belong to this user', loc using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger inventory_items_location_owner before insert or update on public.inventory_items
  for each row execute function public.check_location_owner();
create trigger inventory_locations_parent_owner before insert or update on public.inventory_locations
  for each row execute function public.check_location_owner();
