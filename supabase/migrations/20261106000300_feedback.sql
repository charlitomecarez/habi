-- Report a bug. A sent report cannot change, and only the admin reads other accounts' reports.
alter type public.reminder_source add value if not exists 'feedback';

create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind          text not null default 'bug' check (kind in ('bug', 'idea')),
  message       text not null check (char_length(message) between 1 and 2000),
  app_version   text,
  device_model  text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);
select public.apply_owner_rls('public.feedback');

-- A report cannot change after it is sent. Only the admin can mark it as read.
drop policy "owner_update" on public.feedback;
drop policy "owner_delete" on public.feedback;
create policy "admin_select" on public.feedback for select to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));
create policy "admin_update" on public.feedback for update to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));

-- 20 reports a day for each account, so one account cannot flood the admin.
create or replace function public.on_feedback_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from feedback f
       where f.user_id = new.user_id and f.created_at > now() - interval '1 day') > 20 then
    raise exception 'You sent 20 reports today. Try again tomorrow.' using errcode = 'P0001';
  end if;

  -- No report text in the push. The admin reads it in the app.
  insert into reminders (user_id, source_type, source_id, title, remind_at)
  select a.user_id, 'feedback', new.id,
         case new.kind when 'idea' then 'New idea' else 'New bug report' end, now()
    from app_admins a
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do nothing;

  return new;
end;
$$;
revoke execute on function public.on_feedback_created() from public, anon, authenticated;
create trigger feedback_after_insert after insert on public.feedback
  for each row execute function public.on_feedback_created();
