-- =====================================================================
-- Ulam: one realistic ulam a day, within a price limit.
--   ulam_days  one row per day: 3 options, the one you picked, and what
--              you really ate. Only the last 7 days are kept.
-- At 12:05 AM PHT (16:05 UTC) pg_cron calls the daily-ulam Edge Function,
-- which asks Groq and stores the row. The app reads only this table, so a
-- refresh makes no Groq call. The module sends no notifications.
-- Secrets: GROQ_API_KEY (and CRON_SECRET) as Edge Function secrets.
-- =====================================================================

create table public.ulam_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  on_date     date not null,
  options     jsonb not null default '[]'::jsonb,
  picked      smallint not null default 0 check (picked between 0 and 2),
  custom      jsonb,
  source      text not null default 'backup' check (source in ('groq', 'backup', 'you')),
  eaten       boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, on_date)
);
select public.apply_owner_rls('public.ulam_days');

alter table public.user_settings
  add column ulam_limit smallint not null default 99 check (ulam_limit between 20 and 99),
  add column ulam_avoid text[] not null default '{}';

select cron.schedule(
  'daily-ulam',
  '5 16 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/daily-ulam',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
