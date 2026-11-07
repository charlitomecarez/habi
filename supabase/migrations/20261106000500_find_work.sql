-- Find a work, for the admin only. The app shows the tile only to the admin, and both functions
-- check app_admins on the server. Neither table holds a name, a phone number or an address.
create table public.job_profiles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() unique references auth.users (id) on delete cascade,
  skills         text[] not null default '{}',
  past_roles     text not null default '' check (char_length(past_roles) <= 4000),
  wanted_jobs    text[] not null default '{}',
  countries      text[] not null default '{}',
  remote_ok      boolean not null default true,
  salary_floor   numeric(12, 2) check (salary_floor > 0),
  last_run_at    timestamptz,
  last_ok_at     timestamptz,
  last_new_count integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger job_profiles_updated_at before update on public.job_profiles
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.job_profiles');

create table public.job_matches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  external_id  text not null,
  title        text not null,
  company      text not null,
  location     text,
  is_remote    boolean not null default false,
  visa_offered boolean not null default false,
  url          text not null check (url like 'https://%'),
  posted_on    date,
  summary      text check (char_length(summary) <= 4000), -- plain text, HTML removed
  score        numeric(2, 1) not null check (score between 1 and 5),
  reason       text not null check (char_length(reason) <= 600),
  status       text not null default 'new' check (status in ('new', 'saved', 'applied', 'interview', 'hidden')),
  letter       text check (char_length(letter) <= 6000),
  applied_on   date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, external_id)
);
create index job_matches_user_score_idx on public.job_matches (user_id, status, score desc);
create trigger job_matches_updated_at before update on public.job_matches
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.job_matches');

-- Only job-search adds rows. The app changes the status and the letter.
drop policy "owner_insert" on public.job_matches;

-- 6 AM PHT. The function runs only for accounts in app_admins.
select cron.schedule('job-search', '0 22 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/job-search',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
$job$);
