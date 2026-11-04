-- =====================================================================
-- Daily tip on the Home tab and in the digest. At 12:00 AM PHT (16:00 UTC)
-- pg_cron calls the daily-tip Edge Function, which asks the Gemini API
-- free tier for one tip on a random topic and stores it for each user.
-- One call a day. The prompt has no personal data.
-- Secrets: GEMINI_API_KEY (and CRON_SECRET) as Edge Function secrets.
-- =====================================================================

create table public.daily_tips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  on_date     date not null,
  topic       text not null,
  tip         text not null check (length(tip) between 1 and 600),
  created_at  timestamptz not null default now(),
  unique (user_id, on_date)
);
select public.apply_owner_rls('public.daily_tips');

select cron.schedule(
  'daily-tip',
  '0 16 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/daily-tip',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
