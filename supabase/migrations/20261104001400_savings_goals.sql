-- =====================================================================
-- Savings goals. A goal counts only the money you mark for it
-- (savings_contributions), not the account balance, so two goals can
-- share one account. A withdrawal is a negative contribution.
-- =====================================================================

create table public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null check (length(name) between 1 and 80),
  target_amount  numeric(12, 2) not null check (target_amount > 0),
  target_date    date,
  account_id     uuid references public.money_accounts (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger savings_goals_updated_at before update on public.savings_goals
  for each row execute function public.set_updated_at();
create trigger savings_goals_refs before insert or update on public.savings_goals
  for each row execute function public.check_money_refs();
select public.apply_owner_rls('public.savings_goals');

create table public.savings_contributions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid not null references public.savings_goals (id) on delete cascade,
  amount      numeric(12, 2) not null check (amount <> 0),
  on_date     date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);
create index savings_contributions_goal_idx on public.savings_contributions (goal_id, on_date desc);
select public.apply_owner_rls('public.savings_contributions');
