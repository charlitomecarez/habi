-- =====================================================================
-- Money: accounts, categories, transactions, balances, subscriptions
--
-- Statement import (GCash / MariBank / GoTyme files) is a future feature.
-- transactions.source and transactions.external_ref are already here so
-- imported rows can be de-duplicated when that feature lands.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Accounts: cash on hand, e-wallets, banks
-- ---------------------------------------------------------------------
create type public.money_account_kind as enum ('cash', 'ewallet', 'bank', 'credit_card', 'other');

create table public.money_accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (length(name) between 1 and 60),
  kind             public.money_account_kind not null default 'other',
  opening_balance  numeric(12, 2) not null default 0,
  currency         char(3) not null default 'PHP',
  is_archived      boolean not null default false,
  sort_order       smallint not null default 0,
  created_at       timestamptz not null default now(),
  unique (user_id, name)
);
select public.apply_owner_rls('public.money_accounts');

-- ---------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------
create type public.money_category_kind as enum ('expense', 'income');

create table public.money_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(name) between 1 and 40),
  kind        public.money_category_kind not null default 'expense',
  icon        text,
  sort_order  smallint not null default 0,
  unique (user_id, kind, name)
);
select public.apply_owner_rls('public.money_categories');

-- ---------------------------------------------------------------------
-- Exchange rates you set yourself (e.g. USD -> PHP for Claude Pro)
-- ---------------------------------------------------------------------
create table public.exchange_rates (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  currency     char(3) not null check (currency <> 'PHP'),
  rate_to_php  numeric(12, 4) not null check (rate_to_php > 0),
  updated_at   timestamptz not null default now(),
  primary key (user_id, currency)
);
select public.apply_owner_rls('public.exchange_rates');

-- ---------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------
create type public.billing_cycle as enum ('weekly', 'monthly', 'quarterly', 'yearly');

create table public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                text not null check (length(name) between 1 and 80),
  amount              numeric(12, 2) not null check (amount > 0),
  currency            char(3) not null default 'PHP',
  billing_cycle       public.billing_cycle not null default 'monthly',
  next_billing_on     date not null,
  account_id          uuid references public.money_accounts (id) on delete set null,
  category_id         uuid references public.money_categories (id) on delete set null,
  remind_days_before  smallint not null default 2 check (remind_days_before between 0 and 30),
  is_active           boolean not null default true,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions (user_id, next_billing_on) where is_active;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.subscriptions');

-- ---------------------------------------------------------------------
-- Transactions
--   expense / income : account_id + category_id, no to_account_id
--   transfer         : account_id (from) -> to_account_id, no category
-- amount is always positive; kind decides the direction.
-- ---------------------------------------------------------------------
create type public.transaction_kind as enum ('expense', 'income', 'transfer');
create type public.transaction_source as enum ('manual', 'import');

create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind             public.transaction_kind not null default 'expense',
  account_id       uuid not null references public.money_accounts (id) on delete restrict,
  to_account_id    uuid references public.money_accounts (id) on delete restrict,
  category_id      uuid references public.money_categories (id) on delete set null,
  subscription_id  uuid references public.subscriptions (id) on delete set null,
  amount           numeric(12, 2) not null check (amount > 0),
  occurred_on      date not null default current_date,
  merchant         text,
  note             text,
  source           public.transaction_source not null default 'manual',
  external_ref     text,      -- bank reference no., for future import de-duplication
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (
    (kind = 'transfer' and to_account_id is not null and to_account_id <> account_id and category_id is null)
    or (kind <> 'transfer' and to_account_id is null)
  )
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id, occurred_on desc);
create index transactions_to_account_idx on public.transactions (to_account_id) where to_account_id is not null;
create index transactions_category_idx on public.transactions (category_id, occurred_on desc);
create unique index transactions_external_ref_unique
  on public.transactions (account_id, external_ref) where external_ref is not null;
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.transactions');

-- ---------------------------------------------------------------------
-- Integrity: referenced accounts, categories and subscriptions must be
-- the same user's. One function serves several tables via to_jsonb.
-- ---------------------------------------------------------------------
create or replace function public.check_money_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := to_jsonb(new);
  v uuid;
begin
  v := (r ->> 'account_id')::uuid;
  if v is not null and not exists (select 1 from money_accounts where id = v and user_id = new.user_id) then
    raise exception 'account % does not belong to this user', v using errcode = '42501';
  end if;
  v := (r ->> 'to_account_id')::uuid;
  if v is not null and not exists (select 1 from money_accounts where id = v and user_id = new.user_id) then
    raise exception 'account % does not belong to this user', v using errcode = '42501';
  end if;
  v := (r ->> 'category_id')::uuid;
  if v is not null and not exists (select 1 from money_categories where id = v and user_id = new.user_id) then
    raise exception 'category % does not belong to this user', v using errcode = '42501';
  end if;
  v := (r ->> 'subscription_id')::uuid;
  if v is not null and not exists (select 1 from subscriptions where id = v and user_id = new.user_id) then
    raise exception 'subscription % does not belong to this user', v using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger transactions_refs before insert or update on public.transactions
  for each row execute function public.check_money_refs();
create trigger subscriptions_refs before insert or update on public.subscriptions
  for each row execute function public.check_money_refs();

-- ---------------------------------------------------------------------
-- Balances: opening + income - expenses - transfers out + transfers in.
-- ---------------------------------------------------------------------
create or replace view public.money_account_balances
with (security_invoker = true)
as
select a.id as account_id,
       a.user_id,
       a.name,
       a.kind,
       a.currency,
       a.is_archived,
       a.sort_order,
       a.opening_balance
         + coalesce(sum(case
             when t.kind = 'income'   and t.account_id    = a.id then  t.amount
             when t.kind = 'expense'  and t.account_id    = a.id then -t.amount
             when t.kind = 'transfer' and t.account_id    = a.id then -t.amount
             when t.kind = 'transfer' and t.to_account_id = a.id then  t.amount
           end), 0) as balance
  from public.money_accounts a
  left join public.transactions t
         on t.account_id = a.id or t.to_account_id = a.id
 group by a.id;

-- Subscriptions with their cost per month in PHP.
create or replace view public.subscription_costs
with (security_invoker = true)
as
select s.*,
       case when s.currency = 'PHP' then 1 else er.rate_to_php end as rate_to_php,
       round(
         s.amount
         * case when s.currency = 'PHP' then 1 else er.rate_to_php end
         * case s.billing_cycle
             when 'weekly'    then 52.0 / 12
             when 'monthly'   then 1
             when 'quarterly' then 1.0 / 3
             when 'yearly'    then 1.0 / 12
           end, 2) as monthly_php   -- null when a foreign currency has no rate set yet
  from public.subscriptions s
  left join public.exchange_rates er
         on er.user_id = s.user_id and er.currency = s.currency;

-- ---------------------------------------------------------------------
-- Renewal reminders: one pending reminder per active subscription,
-- at 9:00 local time, remind_days_before the next billing date.
-- ---------------------------------------------------------------------
alter type public.reminder_source add value if not exists 'subscription';

create or replace function public.sync_subscription_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
begin
  if tg_op = 'DELETE' then
    delete from reminders
     where source_type = 'subscription' and source_id = old.id and sent_at is null;
    return old;
  end if;

  if not new.is_active then
    delete from reminders
     where source_type = 'subscription' and source_id = new.id and sent_at is null;
    return new;
  end if;

  select timezone into tz from user_settings where user_id = new.user_id;

  insert into reminders (user_id, source_type, source_id, title, body, remind_at)
  values (
    new.user_id, 'subscription', new.id,
    new.name || ' renews ' || to_char(new.next_billing_on, 'Mon DD'),
    new.currency || ' ' || to_char(new.amount, 'FM999,999,990.00'),
    ((new.next_billing_on - new.remind_days_before)::timestamp + time '09:00')
      at time zone coalesce(tz, 'Asia/Manila')
  )
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do update set title = excluded.title,
                body = excluded.body,
                remind_at = excluded.remind_at;
  return new;
end;
$$;

create trigger subscriptions_sync_reminder
  after insert or update of name, amount, currency, next_billing_on, remind_days_before, is_active or delete
  on public.subscriptions
  for each row execute function public.sync_subscription_reminder();

-- Paying a subscription (a transaction linked to it) moves its next
-- billing date forward one cycle, which also reschedules its reminder.
create or replace function public.advance_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subscription_id is not null then
    update subscriptions s
       set next_billing_on = (s.next_billing_on + case s.billing_cycle
                                when 'weekly'    then interval '7 days'
                                when 'monthly'   then interval '1 month'
                                when 'quarterly' then interval '3 months'
                                when 'yearly'    then interval '1 year'
                              end)::date
     where s.id = new.subscription_id
       and new.occurred_on >= s.next_billing_on - s.remind_days_before - 7;
  end if;
  return new;
end;
$$;

create trigger transactions_advance_subscription after insert on public.transactions
  for each row execute function public.advance_subscription();

-- ---------------------------------------------------------------------
-- First-run defaults. The app calls this once after sign-in:
--   supabase.rpc('seed_money_defaults')
-- It only adds rows when the user has none, so calling it again is safe.
-- ---------------------------------------------------------------------
create or replace function public.seed_money_defaults()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  if not exists (select 1 from money_accounts where user_id = auth.uid()) then
    insert into money_accounts (name, kind, sort_order) values
      ('Cash on hand', 'cash',    1),
      ('GCash',        'ewallet', 2),
      ('MariBank',     'bank',    3),
      ('GoTyme',       'bank',    4);
  end if;

  if not exists (select 1 from money_categories where user_id = auth.uid()) then
    insert into money_categories (name, kind, icon, sort_order) values
      ('Food',              'expense', 'utensils',     1),
      ('Groceries',         'expense', 'cart',         2),
      ('Transport',         'expense', 'bus',          3),
      ('Motorcycle',        'expense', 'bike',         4),
      ('Bills & utilities', 'expense', 'bolt',         5),
      ('Subscriptions',     'expense', 'repeat',       6),
      ('Shopping',          'expense', 'bag',          7),
      ('Health',            'expense', 'heart',        8),
      ('Entertainment',     'expense', 'film',         9),
      ('Other',             'expense', 'dots',        10),
      ('Salary',            'income',  'briefcase',    1),
      ('Freelance',         'income',  'laptop',       2),
      ('Other income',      'income',  'plus',         3);
  end if;
end;
$$;
revoke execute on function public.seed_money_defaults() from public, anon;
grant execute on function public.seed_money_defaults() to authenticated;
