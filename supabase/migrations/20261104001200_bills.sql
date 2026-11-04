-- =====================================================================
-- Bills with a changing amount (Meralco, water, internet). They live in
-- subscriptions with kind = 'bill': a due date that repeats and a reminder,
-- and you type the amount when you pay. Paying (a transaction with the
-- subscription_id) moves the due date, the same as a subscription.
--   * subscriptions.amount is now optional; a subscription still needs one.
--   * Auto-add skips bills, since the amount is not known.
-- =====================================================================

create type public.subscription_kind as enum ('subscription', 'bill');

alter table public.subscriptions add column kind public.subscription_kind not null default 'subscription';
alter table public.subscriptions alter column amount drop not null;
alter table public.subscriptions add constraint subscriptions_amount_needed
  check (kind = 'bill' or amount is not null);
alter table public.subscriptions add constraint subscriptions_bill_no_auto_add
  check (kind = 'subscription' or not auto_add);

-- Rebuild subscription_costs so "s.*" includes kind. Same definition as before.
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
           end, 2) as monthly_php   -- null for a bill, or a foreign currency with no rate yet
  from public.subscriptions s
  left join public.exchange_rates er
         on er.user_id = s.user_id and er.currency = s.currency;

-- Bill reminders say "is due" and have no amount.
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
    new.name || case when new.kind = 'bill' then ' is due ' else ' renews ' end || to_char(new.next_billing_on, 'Mon DD'),
    case when new.amount is null then 'Log the amount when you pay.'
         else new.currency || ' ' || to_char(new.amount, 'FM999,999,990.00') end,
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
