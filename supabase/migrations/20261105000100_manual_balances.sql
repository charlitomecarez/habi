-- =====================================================================
-- Account balances are numbers the user sets. Logging never changes them.
--   money_account_balances  balance is opening_balance, with no transactions.
--   record_debt_payment     a debt payment adds no Money transaction.
-- No transaction is deleted. Old debt payments keep their transaction_id,
-- so deleting one still removes its old transaction.
-- =====================================================================

-- The + 0 keeps the view column as plain numeric, which create or replace needs.
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
       a.opening_balance + 0 as balance
  from public.money_accounts a;

-- p_account_id is ignored. It stays optional so the installed v1.1.0 app can still call this.
create or replace function public.record_debt_payment(
  p_debt_id uuid, p_amount numeric, p_paid_on date, p_account_id uuid default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  pay uuid;
begin
  if not exists (select 1 from debts where id = p_debt_id) then
    raise exception 'debt % not found', p_debt_id using errcode = 'P0002';
  end if;

  insert into debt_payments (debt_id, amount, paid_on)
  values (p_debt_id, p_amount, p_paid_on)
  returning id into pay;
  return pay;
end;
$$;
