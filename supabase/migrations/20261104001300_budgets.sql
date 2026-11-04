-- =====================================================================
-- Monthly budget per expense category, with carry-over.
--   available(month) = monthly_limit + carry(month)
--   carry(month)     = max(0, available(previous month) - spent(previous month))
-- so unspent money carries over and overspending does not. It is worked
-- out from the months' totals, never stored, so editing an old
-- transaction fixes it by itself. Transfers do not count.
-- A notification at 80% and at 100% of the month's available amount,
-- once each per month (budget_alerts).
-- =====================================================================

create table public.money_budgets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id    uuid not null references public.money_categories (id) on delete cascade,
  monthly_limit  numeric(12, 2) not null check (monthly_limit > 0),
  starts_on      date not null default date_trunc('month', current_date)::date,  -- first month it counts
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, category_id)
);
create trigger money_budgets_updated_at before update on public.money_budgets
  for each row execute function public.set_updated_at();
create trigger money_budgets_refs before insert or update on public.money_budgets
  for each row execute function public.check_money_refs();
select public.apply_owner_rls('public.money_budgets');

create table public.budget_alerts (
  budget_id  uuid not null references public.money_budgets (id) on delete cascade,
  month      date not null,
  level      smallint not null check (level in (80, 100)),
  sent_at    timestamptz not null default now(),
  primary key (budget_id, month, level)
);
alter table public.budget_alerts enable row level security;  -- written by the trigger only

-- Spent and available for one budget in the month that contains p_month.
create or replace function public.budget_month(p_budget_id uuid, p_month date)
returns table (available numeric, spent numeric, carried numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  b money_budgets%rowtype;
  m date;
  target date := date_trunc('month', p_month)::date;
  carry numeric := 0;
  month_spent numeric;
begin
  select * into b from money_budgets where id = p_budget_id;
  if not found then return; end if;
  m := date_trunc('month', b.starts_on)::date;
  if target < m then
    return query select b.monthly_limit, 0::numeric, 0::numeric;
    return;
  end if;
  loop
    select coalesce(sum(amount), 0) into month_spent from transactions
     where user_id = b.user_id and kind = 'expense' and category_id = b.category_id
       and occurred_on >= m and occurred_on < (m + interval '1 month')::date;
    if m = target then
      return query select b.monthly_limit + carry, month_spent, carry;
      return;
    end if;
    carry := greatest(0, b.monthly_limit + carry - month_spent);
    m := (m + interval '1 month')::date;
  end loop;
end;
$$;
revoke execute on function public.budget_month(uuid, date) from public, anon, authenticated;

alter type public.reminder_source add value if not exists 'budget';

create or replace function public.check_budget_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  r record;
  lvl smallint;
  cat text;
  month date;
begin
  if new.kind <> 'expense' or new.category_id is null then return new; end if;
  month := date_trunc('month', new.occurred_on)::date;
  -- Only the current month notifies; logging an old expense stays quiet.
  if month <> date_trunc('month', current_date)::date then return new; end if;

  for b in select id from money_budgets where user_id = new.user_id and category_id = new.category_id loop
    select * into r from budget_month(b.id, month);
    if r.available is null or r.available <= 0 then continue; end if;
    lvl := case when r.spent >= r.available then 100 when r.spent >= r.available * 0.8 then 80 else null end;
    continue when lvl is null;
    insert into budget_alerts (budget_id, month, level) values (b.id, month, lvl) on conflict do nothing;
    continue when not found;
    if lvl = 100 then
      insert into budget_alerts (budget_id, month, level) values (b.id, month, 80) on conflict do nothing;
    end if;

    select name into cat from money_categories where id = new.category_id;
    insert into reminders (user_id, source_type, source_id, title, body, remind_at)
    values (new.user_id, 'budget', b.id,
            case when lvl = 100 then cat || ' budget is used up' else cat || ' budget is 80% used' end,
            '₱' || to_char(r.spent, 'FM999,999,990.00') || ' of ₱' || to_char(r.available, 'FM999,999,990.00') || ' this month',
            now())
    on conflict (source_type, source_id) where sent_at is null and source_id is not null
    do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
  end loop;
  return new;
end;
$$;

create trigger transactions_budget_alert after insert or update of amount, category_id, occurred_on, kind on public.transactions
  for each row execute function public.check_budget_alert();
