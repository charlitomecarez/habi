-- =====================================================================
-- Documents and renewals: the dates that cost money when you miss them.
--   * One row per document: type, name, number, issued and expiry dates.
--   * A reminder at 9:00 local time, remind_days_before the expiry
--     (30 by default). A new expiry date (renewal) moves it.
--   * photo_paths are files encrypted on the phone with the Vault key
--     (lib/secure-photos.ts). Supabase only stores ciphertext, so the
--     bucket now also accepts application/octet-stream.
-- =====================================================================

update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream']
 where id = 'user-files';

create type public.document_type as enum
  ('lto_registration', 'drivers_license', 'passport', 'insurance', 'philhealth', 'other');

create table public.documents (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type                public.document_type not null default 'other',
  name                text not null check (length(name) between 1 and 120),
  number              text,
  issued_on           date,
  expires_on          date,
  remind_days_before  smallint not null default 30 check (remind_days_before between 0 and 365),
  vehicle_id          uuid references public.vehicles (id) on delete set null,
  photo_paths         text[] not null default '{}',
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index documents_user_expiry_idx on public.documents (user_id, expires_on);
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.documents');

-- The linked vehicle must be the same user's.
create or replace function public.check_document_vehicle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vehicle_id is not null
     and not exists (select 1 from vehicles where id = new.vehicle_id and user_id = new.user_id) then
    raise exception 'vehicle % does not belong to this user', new.vehicle_id using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger documents_check_vehicle before insert or update of vehicle_id on public.documents
  for each row execute function public.check_document_vehicle();

alter type public.reminder_source add value if not exists 'document';

create or replace function public.sync_document_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
begin
  if tg_op = 'DELETE' then
    delete from reminders where source_type = 'document' and source_id = old.id and sent_at is null;
    return old;
  end if;
  if new.expires_on is null then
    delete from reminders where source_type = 'document' and source_id = new.id and sent_at is null;
    return new;
  end if;

  select timezone into tz from user_settings where user_id = new.user_id;
  tz := coalesce(tz, 'Asia/Manila');
  insert into reminders (user_id, source_type, source_id, title, body, remind_at)
  values (
    new.user_id, 'document', new.id,
    new.name || ' expires ' || to_char(new.expires_on, 'Mon FMDD, YYYY'),
    'Renew it before it lapses.',
    greatest(((new.expires_on - new.remind_days_before)::timestamp + time '09:00') at time zone tz, now())
  )
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
  return new;
end;
$$;

create trigger documents_sync_reminder
  after insert or update of name, expires_on, remind_days_before or delete
  on public.documents
  for each row execute function public.sync_document_reminder();
