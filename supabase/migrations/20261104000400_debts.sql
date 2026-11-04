-- =====================================================================
-- Debts (utang): who owes you and who you owe.
--   debts          one row per debt; the person is a typed name for now
--                  (milestone 8 adds person_id for People and dates).
--   debt_payments  partial or full payments; each one adds a Money
--                  transaction (income when they pay you, expense when you pay).
--   debt_balances  view: amount, paid and what is left.
-- A reminder goes out at 9:00 on the due date while something is left.
-- =====================================================================

create type public.debt_direction as enum ('owed_to_me', 'i_owe');

create table public.debts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_name  text not null check (length(person_name) between 1 and 80),
  direction    public.debt_direction not null,
  amount       numeric(12, 2) not null check (amount > 0),
  occurred_on  date not null default current_date,
  due_on       date,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index debts_user_idx on public.debts (user_id, direction);
create trigger debts_updated_at before update on public.debts
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.debts');

create table public.debt_payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  debt_id         uuid not null references public.debts (id) on delete cascade,
  amount          numeric(12, 2) not null check (amount > 0),
  paid_on         date not null default current_date,
  account_id      uuid references public.money_accounts (id) on delete set null,
  transaction_id  uuid references public.transactions (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index debt_payments_debt_idx on public.debt_payments (debt_id);
select public.apply_owner_rls('public.debt_payments');

create view public.debt_balances
with (security_invoker = true)
as
select d.id as debt_id,
       d.user_id,
       d.amount,
       coalesce(sum(p.amount), 0) as paid,
       greatest(d.amount - coalesce(sum(p.amount), 0), 0) as balance
  from public.debts d
  left join public.debt_payments p on p.debt_id = d.id
 group by d.id;

-- ---------------------------------------------------------------------
-- Record a payment and its Money transaction in one step. Runs as the
-- caller, so RLS and the money ownership checks apply.
-- ---------------------------------------------------------------------
create or replace function public.record_debt_payment(
  p_debt_id uuid, p_amount numeric, p_paid_on date, p_account_id uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  d debts%rowtype;
  tx uuid;
  pay uuid;
begin
  select * into d from debts where id = p_debt_id;
  if not found then
    raise exception 'debt % not found', p_debt_id using errcode = 'P0002';
  end if;

  insert into transactions (kind, account_id, amount, occurred_on, merchant, note)
  values (
    case d.direction when 'owed_to_me' then 'income'::transaction_kind else 'expense'::transaction_kind end,
    p_account_id, p_amount, p_paid_on, d.person_name,
    case d.direction when 'owed_to_me' then 'Debt paid to you' else 'Debt you paid' end
  )
  returning id into tx;

  insert into debt_payments (debt_id, amount, paid_on, account_id, transaction_id)
  values (p_debt_id, p_amount, p_paid_on, p_account_id, tx)
  returning id into pay;
  return pay;
end;
$$;

-- Deleting a payment also deletes its transaction, so the balance and the account agree.
create or replace function public.delete_debt_payment_transaction()
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

create trigger debt_payments_delete_transaction after delete on public.debt_payments
  for each row execute function public.delete_debt_payment_transaction();

-- ---------------------------------------------------------------------
-- Due-date reminder while a balance is left.
-- ---------------------------------------------------------------------
alter type public.reminder_source add value if not exists 'debt';

create or replace function public.sync_debt_reminder_for(p_debt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d debts%rowtype;
  left_amount numeric;
  tz text;
begin
  select * into d from debts where id = p_debt_id;
  if not found then
    delete from reminders where source_type = 'debt' and source_id = p_debt_id and sent_at is null;
    return;
  end if;

  select balance into left_amount from debt_balances where debt_id = p_debt_id;
  if d.due_on is null or coalesce(left_amount, 0) <= 0 then
    delete from reminders where source_type = 'debt' and source_id = p_debt_id and sent_at is null;
    return;
  end if;

  select timezone into tz from user_settings where user_id = d.user_id;
  insert into reminders (user_id, source_type, source_id, title, body, remind_at)
  values (
    d.user_id, 'debt', d.id,
    case d.direction when 'owed_to_me' then d.person_name || ' pays you back today'
                     else 'Pay ' || d.person_name || ' today' end,
    '₱' || to_char(left_amount, 'FM999,999,990.00') || ' left',
    (d.due_on::timestamp + time '09:00') at time zone coalesce(tz, 'Asia/Manila')
  )
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
end;
$$;
revoke execute on function public.sync_debt_reminder_for(uuid) from public, anon, authenticated;

create or replace function public.sync_debt_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'debts' then
    perform sync_debt_reminder_for(coalesce(new.id, old.id));
  else
    perform sync_debt_reminder_for(coalesce(new.debt_id, old.debt_id));
  end if;
  return coalesce(new, old);
end;
$$;

create trigger debts_sync_reminder after insert or update or delete on public.debts
  for each row execute function public.sync_debt_reminder();
create trigger debt_payments_sync_reminder after insert or delete on public.debt_payments
  for each row execute function public.sync_debt_reminder();
