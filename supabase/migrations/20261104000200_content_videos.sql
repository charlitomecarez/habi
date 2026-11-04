-- =====================================================================
-- Content planner: one row per video, from idea to published.
-- Ported from the content-planner app (Appwrite "videos"). Starts empty;
-- nothing is imported from Appwrite.
-- =====================================================================

create type public.content_stage as enum ('idea', 'script', 'record', 'edit', 'polish', 'publish', 'published');
create type public.content_format as enum ('long', 'short');

create table public.content_videos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (length(title) between 1 and 200),
  stage         public.content_stage not null default 'idea',
  format        public.content_format not null default 'long',
  platforms     text[] not null default '{}',
  publish_on    date,
  priority      smallint not null default 1 check (priority between 0 and 2), -- 0 low, 1 normal, 2 high
  hook          text not null default '',
  notes         text not null default '',
  project_slug  text not null default '',   -- folder in video-editing-workflow/projects
  done_steps    text[] not null default '{}',
  posts         jsonb not null default '[]'::jsonb,  -- [{ platform, postedAt, url }]
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index content_videos_user_stage_idx on public.content_videos (user_id, stage);
create index content_videos_user_publish_idx on public.content_videos (user_id, publish_on) where publish_on is not null;
create trigger content_videos_updated_at before update on public.content_videos
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.content_videos');

-- ---------------------------------------------------------------------
-- Publish-day reminder: 9:00 local time on publish_on, while the video is
-- not published yet. The reminder Edge Function sends it.
-- ---------------------------------------------------------------------
alter type public.reminder_source add value if not exists 'content';

create or replace function public.sync_content_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
begin
  if tg_op = 'DELETE' then
    delete from reminders where source_type = 'content' and source_id = old.id and sent_at is null;
    return old;
  end if;

  if new.publish_on is null or new.stage = 'published' then
    delete from reminders where source_type = 'content' and source_id = new.id and sent_at is null;
    return new;
  end if;

  select timezone into tz from user_settings where user_id = new.user_id;

  insert into reminders (user_id, source_type, source_id, title, body, remind_at)
  values (
    new.user_id, 'content', new.id,
    'Publish today: ' || new.title,
    initcap(new.stage::text) || ' stage',
    (new.publish_on::timestamp + time '09:00') at time zone coalesce(tz, 'Asia/Manila')
  )
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
  return new;
end;
$$;

create trigger content_videos_sync_reminder
  after insert or update of title, stage, publish_on or delete
  on public.content_videos
  for each row execute function public.sync_content_reminder();
