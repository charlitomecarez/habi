-- =====================================================================
-- Subscriptions add their own expense on the billing day.
--
--   * subscriptions.auto_add: on by default for new subscriptions. Rows that
--     exist before this migration stay off, so nothing you already log by hand
--     is doubled. Turn it on per subscription in the app.
--   * add_due_subscription_expenses(): inserts one expense per due, active,
--     auto-add subscription that has an account. The existing
--     transactions_advance_subscription trigger then moves next_billing_on
--     forward one cycle, which also reschedules the renewal reminder.
--   * pg_cron runs it every hour. Running it twice adds nothing: each expense
--     carries external_ref 'subscription:<id>:<billing date>', and the unique
--     index transactions_external_ref_unique on (account_id, external_ref)
--     rejects the second insert.
-- =====================================================================

alter table public.subscriptions add column auto_add boolean not null default false;
alter table public.subscriptions alter column auto_add set default true;

-- subscription_costs is "select s.*", which Postgres expands when the view is
-- made, so it must be rebuilt to include auto_add. Same definition as before.
drop view public.subscription_costs;
create view public.subscription_costs
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
-- The job. A subscription is due when its billing date is today or up to
-- 7 days ago in the user's time zone (so a missed run catches up), it is
-- active, auto_add is on and it has an account.
--
-- Amount: the subscription's amount when it is in the account's currency.
-- A USD subscription on a PHP account uses your exchange rate. With no rate
-- set, it is skipped and shows as "not logged" in the app, as before.
-- ---------------------------------------------------------------------
create or replace function public.add_due_subscription_expenses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  added integer := 0;
  n integer;
begin
  for s in
    select sub.id, sub.user_id, sub.name, sub.amount, sub.currency, sub.next_billing_on,
           sub.account_id, sub.category_id,
           case
             when sub.currency = acc.currency then sub.amount
             when acc.currency = 'PHP' and er.rate_to_php is not null
               then round(sub.amount * er.rate_to_php, 2)
           end as charge
      from subscriptions sub
      join money_accounts acc on acc.id = sub.account_id
      left join user_settings us on us.user_id = sub.user_id
      left join exchange_rates er on er.user_id = sub.user_id and er.currency = sub.currency
     where sub.is_active
       and sub.auto_add
       and sub.next_billing_on <= (now() at time zone coalesce(us.timezone, 'Asia/Manila'))::date
       and sub.next_billing_on >= (now() at time zone coalesce(us.timezone, 'Asia/Manila'))::date - 7
  loop
    continue when s.charge is null;

    insert into transactions
      (user_id, kind, account_id, category_id, subscription_id, amount, occurred_on, merchant, note, external_ref)
    values
      (s.user_id, 'expense', s.account_id, s.category_id, s.id, s.charge, s.next_billing_on, s.name,
       case when s.currency = 'PHP' then 'Added on the billing day'
            else 'Added on the billing day · ' || s.currency || ' ' || to_char(s.amount, 'FM999,999,990.00')
       end,
       'subscription:' || s.id || ':' || s.next_billing_on)
    on conflict (account_id, external_ref) where external_ref is not null do nothing;

    get diagnostics n = row_count;
    added := added + n;
  end loop;
  return added;
end;
$$;

-- Only pg_cron (as postgres) runs it; signed-in users cannot call it.
revoke execute on function public.add_due_subscription_expenses() from public, anon, authenticated;

select cron.schedule(
  'add-subscription-expenses',
  '5 * * * *',
  $job$ select public.add_due_subscription_expenses(); $job$
);
