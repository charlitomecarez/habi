-- =====================================================================
-- Core: shared helpers, user settings, push tokens, reminders
-- =====================================================================

-- Keeps updated_at current on any table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Standard owner-only RLS: enables RLS and adds select/insert/update/delete
-- policies scoped to user_id = auth.uid(). Called once per user-owned table.
create or replace function public.apply_owner_rls(tbl regclass)
returns void
language plpgsql
as $$
begin
  execute format('alter table %s enable row level security', tbl);
  execute format('create policy "owner_select" on %s for select to authenticated using (user_id = (select auth.uid()))', tbl);
  execute format('create policy "owner_insert" on %s for insert to authenticated with check (user_id = (select auth.uid()))', tbl);
  execute format('create policy "owner_update" on %s for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', tbl);
  execute format('create policy "owner_delete" on %s for delete to authenticated using (user_id = (select auth.uid()))', tbl);
end;
$$;
-- Migration-only helper: not callable from the app.
revoke execute on function public.apply_owner_rls(regclass) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- user_settings: one row per user (timezone + daily digest preferences)
-- ---------------------------------------------------------------------
create table public.user_settings (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  timezone        text not null default 'Asia/Manila',
  digest_enabled  boolean not null default true,
  digest_hour     smallint not null default 7 check (digest_hour between 0 and 23),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.user_settings');

-- ---------------------------------------------------------------------
-- push_tokens: Expo push tokens per device (Android)
-- ---------------------------------------------------------------------
create table public.push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token         text not null unique,
  platform      text not null default 'android' check (platform in ('android', 'ios', 'web')),
  device_name   text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
select public.apply_owner_rls('public.push_tokens');

-- ---------------------------------------------------------------------
-- reminders: the single queue the reminder Edge Function reads.
-- Modules write here (todos via trigger, vehicles on odometer logs).
-- ---------------------------------------------------------------------
create type public.reminder_source as enum ('todo', 'vehicle_service', 'custom');

create table public.reminders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_type  public.reminder_source not null default 'custom',
  source_id    uuid,
  title        text not null,
  body         text,
  remind_at    timestamptz not null,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- What the cron job scans: due and unsent. Partial index keeps each run cheap.
create index reminders_due_idx on public.reminders (remind_at) where sent_at is null;
-- At most one pending reminder per source (lets triggers upsert safely).
create unique index reminders_one_pending_per_source
  on public.reminders (source_type, source_id)
  where sent_at is null and source_id is not null;
create index reminders_user_idx on public.reminders (user_id);
select public.apply_owner_rls('public.reminders');
