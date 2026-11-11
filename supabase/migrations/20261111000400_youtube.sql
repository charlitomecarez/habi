-- v1.6.0 milestone 4: YouTube.
--   youtube_channels holds the channels each account follows, at most 30. It is owned: owner RLS.
--   youtube_videos and youtube_feeds are a cache by channel. An account reads a channel's videos only
--   when it follows that channel, so another account's channels stay hidden. Only the service role in
--   youtube-channel and youtube-sync writes the cache.
--   The youtube-sync cron runs at 5:30 AM PHT.

create table public.youtube_channels (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  channel_id text not null check (channel_id ~ '^UC[0-9A-Za-z_-]{22}$'),
  title      text not null check (char_length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (user_id, channel_id)
);
select public.apply_owner_rls('public.youtube_channels');
create index youtube_channels_channel_idx on public.youtube_channels (channel_id);

create function public.youtube_channels_limit() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.youtube_channels where user_id = new.user_id) >= 30 then
    raise exception 'channel_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger youtube_channels_limit before insert on public.youtube_channels
  for each row execute function public.youtube_channels_limit();

create table public.youtube_videos (
  video_id     text primary key check (video_id ~ '^[0-9A-Za-z_-]{11}$'),
  channel_id   text not null,
  title        text not null,
  published_at timestamptz not null,
  duration_s   integer,
  updated_at   timestamptz not null default now()
);
create index youtube_videos_channel_time_idx on public.youtube_videos (channel_id, published_at desc);

create table public.youtube_feeds (
  channel_id    text primary key,
  last_ok_at    timestamptz,
  last_error_at timestamptz
);

alter table public.youtube_videos enable row level security;
alter table public.youtube_feeds enable row level security;

-- You read a cached video only when you follow its channel.
create policy "follower_read" on public.youtube_videos for select to authenticated
  using (exists (select 1 from public.youtube_channels c
                 where c.channel_id = youtube_videos.channel_id and c.user_id = (select auth.uid())));
create policy "follower_read" on public.youtube_feeds for select to authenticated
  using (exists (select 1 from public.youtube_channels c
                 where c.channel_id = youtube_feeds.channel_id and c.user_id = (select auth.uid())));

select cron.schedule('youtube-sync', '30 21 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/youtube-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
$job$);
