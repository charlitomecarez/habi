-- News (v1.4.0 milestone 8). Headlines from public RSS feeds. No user owns these rows, so apply_owner_rls does not fit.
-- With RLS on and no write policy, only news-sync (service role) can write.
create table public.news_items (
  id           uuid primary key default gen_random_uuid(),
  section      text not null check (section in ('ph', 'world')),
  source       text not null check (char_length(source) between 1 and 40),
  title        text not null check (char_length(title) between 1 and 300),
  url          text not null unique check (url like 'https://%'),
  image_url    text check (image_url like 'https://%' and char_length(image_url) <= 1000),
  published_at timestamptz not null,
  fetched_at   timestamptz not null default now()
);
create index news_items_section_time_idx on public.news_items (section, published_at desc);

create table public.news_sync (
  source        text primary key check (char_length(source) between 1 and 40),
  section       text not null check (section in ('ph', 'world')),
  last_ok_at    timestamptz,
  last_error_at timestamptz
);

alter table public.news_items enable row level security;
alter table public.news_sync  enable row level security;
create policy "signed_in_read" on public.news_items for select to authenticated using (true);
create policy "signed_in_read" on public.news_sync  for select to authenticated using (true);

-- Every 2 hours, at minute 20.
select cron.schedule('news-sync', '20 */2 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/news-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
$job$);
