-- =====================================================================
-- Voice Inbox: your partner records in the app, and you read plain text.
--   voice_pairs       the pairing. One row for each direction.
--   voice_pair_codes  a one-time code, good for 15 minutes.
--   voice_messages    the sender owns the row. The receiver can read it
--                     once the text is ready.
-- All writes go through the RPCs below or the voice-transcribe Edge Function
-- (service role), so the app cannot pair itself to anyone, or set a
-- transcript, a status or a recipient.
-- Audio lives in the private voice-audio bucket at <sender_id>/<id>.<ext>.
-- At 1:00 AM PHT (17:00 UTC) pg_cron calls voice-cleanup, which deletes
-- audio older than 7 days and keeps the text.
-- The push says only "New voice message". The text never goes in a reminder.
-- Secrets: GROQ_API_KEY (and CRON_SECRET) as Edge Function secrets.
-- =====================================================================

alter type public.reminder_source add value if not exists 'inbox';

-- ---------------------------------------------------------------------
-- Pairing
-- ---------------------------------------------------------------------
create table public.voice_pairs (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  partner_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_id <> partner_id)
);
select public.apply_owner_rls('public.voice_pairs');
drop policy "owner_insert" on public.voice_pairs;
drop policy "owner_update" on public.voice_pairs;
drop policy "owner_delete" on public.voice_pairs;

create table public.voice_pair_codes (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  code       text not null unique,
  expires_at timestamptz not null
);
select public.apply_owner_rls('public.voice_pair_codes');
drop policy "owner_insert" on public.voice_pair_codes;
drop policy "owner_update" on public.voice_pair_codes;
drop policy "owner_delete" on public.voice_pair_codes;

create or replace function public.create_voice_pair_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = 'P0001';
  end if;
  if exists (select 1 from voice_pairs where user_id = me) then
    raise exception 'You are already paired.' using errcode = 'P0001';
  end if;
  insert into voice_pair_codes (user_id, code, expires_at)
  values (me, new_code, now() + interval '15 minutes')
  on conflict (user_id) do update set code = excluded.code, expires_at = excluded.expires_at;
  return new_code;
end;
$$;

create or replace function public.redeem_voice_pair_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  owner_id uuid;
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = 'P0001';
  end if;
  select user_id into owner_id from voice_pair_codes
   where code = upper(trim(p_code)) and expires_at > now();
  if owner_id is null then
    raise exception 'This code is wrong or has expired.' using errcode = 'P0001';
  end if;
  if owner_id = me then
    raise exception 'Enter this code on the other phone.' using errcode = 'P0001';
  end if;
  if exists (select 1 from voice_pairs where user_id in (me, owner_id)) then
    raise exception 'One of these accounts is already paired.' using errcode = 'P0001';
  end if;
  insert into voice_pairs (user_id, partner_id) values (me, owner_id), (owner_id, me);
  delete from voice_pair_codes where user_id = owner_id;
end;
$$;

-- Removes both directions. Past messages stay readable.
create or replace function public.unpair_voice()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from voice_pairs where user_id = auth.uid() or partner_id = auth.uid();
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

revoke execute on function public.create_voice_pair_code() from public, anon;
revoke execute on function public.redeem_voice_pair_code(text) from public, anon;
revoke execute on function public.unpair_voice() from public, anon;
revoke execute on function public.mark_voice_inbox_read() from public, anon;
grant execute on function public.create_voice_pair_code() to authenticated;
grant execute on function public.redeem_voice_pair_code(text) to authenticated;
grant execute on function public.unpair_voice() to authenticated;
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
-- Storage: a private bucket. Only a paired sender can upload, and only the
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
    and exists (select 1 from public.voice_pairs p where p.user_id = (select auth.uid()))
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
