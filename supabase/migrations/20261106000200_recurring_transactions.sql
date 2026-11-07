-- A rule that saves its own expense or income on the days you pick.
--
--   * last_run_on: the job never goes back past this day, so a deleted Auto row stays deleted.
--   * on_recurring_resumed(): a resume skips the days that the pause covered.
--   * add_due_recurring(): runs each hour in each user's time zone, and catches up at most 7 days.
--   * external_ref is recurring:<id>:<date>, so the existing unique index blocks a second row.
create table public.recurring_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind         public.transaction_kind not null default 'expense' check (kind in ('expense', 'income')),
  name         text not null check (char_length(name) between 1 and 80),
  amount       numeric(12, 2) not null check (amount > 0),
  account_id   uuid not null references public.money_accounts (id) on delete restrict,
  category_id  uuid references public.money_categories (id) on delete set null,
  schedule     text not null check (schedule in ('daily', 'weekdays', 'weekends', 'weekly', 'monthly')),
  week_days    smallint[] check (week_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]), -- 0 is Sunday
  month_day    smallint check (month_day between 1 and 31),
  starts_on    date not null default current_date,
  ends_on      date,
  is_paused    boolean not null default false,
  last_run_on  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (schedule <> 'weekly' or cardinality(week_days) > 0),
  check (schedule <> 'monthly' or month_day is not null),
  check (ends_on is null or ends_on >= starts_on)
);
create index recurring_transactions_user_idx on public.recurring_transactions (user_id);
create trigger recurring_transactions_updated_at before update on public.recurring_transactions
  for each row execute function public.set_updated_at();
create trigger recurring_transactions_refs before insert or update on public.recurring_transactions
  for each row execute function public.check_money_refs();
select public.apply_owner_rls('public.recurring_transactions');

-- greatest() keeps a run that already happened today.
create or replace function public.on_recurring_resumed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  today date;
begin
  if old.is_paused and not new.is_paused then
    select (now() at time zone coalesce(us.timezone, 'Asia/Manila'))::date into today
      from user_settings us where us.user_id = new.user_id;
    today := coalesce(today, (now() at time zone 'Asia/Manila')::date);
    new.last_run_on := greatest(old.last_run_on, today - 1);
  end if;
  return new;
end;
$$;
revoke execute on function public.on_recurring_resumed() from public, anon, authenticated;
create trigger recurring_transactions_resume before update of is_paused on public.recurring_transactions
  for each row execute function public.on_recurring_resumed();

-- lib/recurring.ts has the same rule for the next date on screen.
create or replace function public.recurring_is_due(r public.recurring_transactions, d date)
returns boolean
language sql
immutable
as $$
  select case r.schedule
    when 'daily' then true
    when 'weekdays' then extract(isodow from d) < 6
    when 'weekends' then extract(isodow from d) >= 6
    when 'weekly' then extract(dow from d)::smallint = any (r.week_days)
    when 'monthly' then extract(day from d) = least(
      r.month_day, extract(day from (date_trunc('month', d) + interval '1 month - 1 day')))
  end;
$$;

create or replace function public.add_due_recurring()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.recurring_transactions;
  today date;
  d date;
  added integer := 0;
  n integer;
begin
  for r in
    select t.* from recurring_transactions t
      join money_accounts a on a.id = t.account_id and not a.is_archived
     where not t.is_paused
  loop
    select (now() at time zone coalesce(us.timezone, 'Asia/Manila'))::date into today
      from user_settings us where us.user_id = r.user_id;
    today := coalesce(today, (now() at time zone 'Asia/Manila')::date);
    continue when r.last_run_on >= today;

    for d in
      select g::date from generate_series(
        greatest(r.starts_on, r.last_run_on + 1, today - 7)::timestamp,
        least(today, coalesce(r.ends_on, today))::timestamp,
        interval '1 day') g
    loop
      continue when not public.recurring_is_due(r, d);
      insert into transactions
        (user_id, kind, account_id, category_id, amount, occurred_on, merchant, note, external_ref)
      values
        (r.user_id, r.kind, r.account_id, r.category_id, r.amount, d, r.name,
         'Added by your recurring rule', 'recurring:' || r.id || ':' || d)
      on conflict (account_id, external_ref) where external_ref is not null do nothing;
      get diagnostics n = row_count;
      added := added + n;
    end loop;

    update recurring_transactions set last_run_on = today where id = r.id;
  end loop;
  return added;
end;
$$;
revoke execute on function public.add_due_recurring() from public, anon, authenticated;

select cron.schedule('add-recurring-transactions', '10 * * * *',
  $job$ select public.add_due_recurring(); $job$);
