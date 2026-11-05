-- =====================================================================
-- Voice Inbox: one person records in the app, and the other reads plain text.
--   app_admins      the admin. Add the row in the SQL editor, so no email
--                   address goes in the repo:
--                     insert into public.app_admins (user_id)
--                     select id from auth.users where email = 'name@example.com';
--   voice_access    the accounts the admin ticked. A ticked account and the
--                   admin can message each other. Ticked accounts cannot
--                   message each other.
--   voice_messages  the sender owns the row. The receiver can read it once
--                   the text is ready.
-- All writes go through the RPCs below or the voice-transcribe Edge Function
-- (service role), so the app cannot tick itself, or set a transcript, a
-- status or a recipient.
-- Audio lives in the private voice-audio bucket at <sender_id>/<id>.<ext>.
-- At 1:00 AM PHT (17:00 UTC) pg_cron calls voice-cleanup, which deletes
-- audio older than 7 days and keeps the text.
-- The push says only "New voice message". The text never goes in a reminder.
-- Secrets: GROQ_API_KEY (and CRON_SECRET) as Edge Function secrets.
-- =====================================================================

alter type public.reminder_source add value if not exists 'inbox';

-- ---------------------------------------------------------------------
-- Who has voice
-- ---------------------------------------------------------------------
create table public.app_admins (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
select public.apply_owner_rls('public.app_admins');
drop policy "owner_insert" on public.app_admins;
drop policy "owner_update" on public.app_admins;
drop policy "owner_delete" on public.app_admins;

create table public.voice_access (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
select public.apply_owner_rls('public.voice_access');
drop policy "owner_insert" on public.voice_access;
drop policy "owner_update" on public.voice_access;
drop policy "owner_delete" on public.voice_access;

-- The admin always has voice. Anyone else needs a tick.
create or replace function public.has_voice_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from app_admins where user_id = (select auth.uid()))
      or exists (select 1 from voice_access where user_id = (select auth.uid()));
$$;

-- Only the admin and a ticked account can message each other.
create or replace function public.voice_can_message(p_sender uuid, p_recipient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    exists (select 1 from app_admins where user_id = p_sender)
    and exists (select 1 from voice_access where user_id = p_recipient)
  ) or (
    exists (select 1 from voice_access where user_id = p_sender)
    and exists (select 1 from app_admins where user_id = p_recipient)
  );
$$;

-- Who you can send to. Shows a name, and shows the admin's email to nobody.
create or replace function public.voice_contacts()
returns table (user_id uuid, name text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if exists (select 1 from app_admins a where a.user_id = me) then
    return query
      select v.user_id, coalesce(u.raw_user_meta_data ->> 'full_name', u.email)::text
        from voice_access v join auth.users u on u.id = v.user_id
       where v.user_id <> me
       order by 2;
  elsif exists (select 1 from voice_access v where v.user_id = me) then
    return query
      select a.user_id, coalesce(u.raw_user_meta_data ->> 'full_name', 'Admin')::text
        from app_admins a join auth.users u on u.id = a.user_id;
  end if;
end;
$$;

-- The admin's list of accounts to tick.
create or replace function public.admin_voice_accounts()
returns table (user_id uuid, name text, email text, ticked boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if not exists (select 1 from app_admins a where a.user_id = me) then
    raise exception 'Only the admin can see this.' using errcode = 'P0001';
  end if;
  return query
    select u.id,
           coalesce(u.raw_user_meta_data ->> 'full_name', u.email)::text,
           u.email::text,
           exists (select 1 from voice_access v where v.user_id = u.id)
      from auth.users u
     where u.id <> me
     order by u.created_at;
end;
$$;

create or replace function public.set_voice_access(p_user_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from app_admins where user_id = auth.uid()) then
    raise exception 'Only the admin can change this.' using errcode = 'P0001';
  end if;
  if p_on then
    insert into voice_access (user_id) values (p_user_id) on conflict (user_id) do nothing;
  else
    delete from voice_access where user_id = p_user_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------
create table public.voice_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  audio_path   text unique,
  duration_s   integer not null check (duration_s between 1 and 300),
  transcript   text,
  status       text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index voice_messages_sender_idx on public.voice_messages (user_id, created_at desc);
create index voice_messages_recipient_idx on public.voice_messages (recipient_id, created_at desc);
select public.apply_owner_rls('public.voice_messages');
drop policy "owner_insert" on public.voice_messages;
drop policy "owner_update" on public.voice_messages;
drop policy "owner_delete" on public.voice_messages;

create policy "recipient_select" on public.voice_messages for select to authenticated
  using (recipient_id = (select auth.uid()) and status = 'ready');

-- Marks everything you received as read.
create or replace function public.mark_voice_inbox_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update voice_messages set read_at = now()
   where recipient_id = auth.uid() and status = 'ready' and read_at is null;
end;
$$;

revoke execute on function public.has_voice_access() from public, anon;
revoke execute on function public.voice_can_message(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.voice_contacts() from public, anon;
revoke execute on function public.admin_voice_accounts() from public, anon;
revoke execute on function public.set_voice_access(uuid, boolean) from public, anon;
revoke execute on function public.mark_voice_inbox_read() from public, anon;
grant execute on function public.has_voice_access() to authenticated;
grant execute on function public.voice_can_message(uuid, uuid) to service_role;
grant execute on function public.voice_contacts() to authenticated;
grant execute on function public.admin_voice_accounts() to authenticated;
grant execute on function public.set_voice_access(uuid, boolean) to authenticated;
grant execute on function public.mark_voice_inbox_read() to authenticated;

-- ---------------------------------------------------------------------
-- Reminder: one push for the receiver when the text is ready, with no text.
-- ---------------------------------------------------------------------
create or replace function public.sync_voice_message_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'ready' and (tg_op = 'INSERT' or old.status <> 'ready') then
    insert into reminders (user_id, source_type, source_id, title, remind_at)
    values (new.recipient_id, 'inbox', new.id, 'New voice message', now())
    on conflict (source_type, source_id) where sent_at is null and source_id is not null
    do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_voice_message_reminder() from public, anon, authenticated;

create trigger voice_messages_sync_reminder after insert or update of status on public.voice_messages
  for each row execute function public.sync_voice_message_reminder();

-- ---------------------------------------------------------------------
-- Storage: a private bucket. Only an account with voice can upload, and only the
-- sender and the receiver can read a file.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-audio', 'voice-audio', false, 5242880,  -- 5 MB cap per file
        array['audio/mp4', 'audio/webm'])
on conflict (id) do nothing;

create policy "voice_audio_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'voice-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.has_voice_access()
  );

create policy "voice_audio_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'voice-audio'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.voice_messages m
         where m.audio_path = storage.objects.name and m.recipient_id = (select auth.uid())
      )
    )
  );

select cron.schedule(
  'voice-cleanup',
  '0 17 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/voice-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
