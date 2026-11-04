-- =====================================================================
-- Shopping list: one list per user.
--   * shopping_items: what to buy; tick at the counter and type the price.
--   * shopping_checkout(): one Money expense with the total of the ticked
--     items, then removes them. Unticked items stay.
--   * shopping_history: items you bought before, for suggestions.
-- =====================================================================

create table public.shopping_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(name) between 1 and 120),
  quantity    text not null default '',
  price       numeric(12, 2) check (price >= 0),
  ticked      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index shopping_items_user_idx on public.shopping_items (user_id, ticked);
select public.apply_owner_rls('public.shopping_items');

create table public.shopping_history (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null,
  last_price      numeric(12, 2),
  times           integer not null default 1,
  last_bought_at  timestamptz not null default now()
);
create unique index shopping_history_user_name_idx on public.shopping_history (user_id, lower(name));
select public.apply_owner_rls('public.shopping_history');

-- Runs as the caller, so RLS and the money ownership checks apply.
create or replace function public.shopping_checkout(p_account_id uuid, p_category_id uuid, p_store text)
returns numeric
language plpgsql
set search_path = public
as $$
declare
  total numeric;
  names text;
  uid uuid := auth.uid();
begin
  select coalesce(sum(price), 0), string_agg(name, ', ' order by created_at)
    into total, names
    from shopping_items where user_id = uid and ticked;
  if names is null then
    raise exception 'Tick the items you bought first.' using errcode = 'P0001';
  end if;

  if total > 0 then
    insert into transactions (kind, account_id, category_id, amount, occurred_on, merchant, note)
    values ('expense', p_account_id, p_category_id, total, current_date,
            coalesce(nullif(trim(p_store), ''), 'Shopping'), left(names, 500));
  end if;

  insert into shopping_history (user_id, name, last_price, times, last_bought_at)
  select distinct on (lower(name)) uid, name, price, 1, now()
    from shopping_items where user_id = uid and ticked
   order by lower(name), created_at desc
  on conflict (user_id, lower(name))
  do update set last_price = coalesce(excluded.last_price, shopping_history.last_price),
                times = shopping_history.times + 1,
                last_bought_at = now();

  delete from shopping_items where user_id = uid and ticked;
  return total;
end;
$$;
