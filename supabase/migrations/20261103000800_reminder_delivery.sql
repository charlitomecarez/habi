-- =====================================================================
-- Reminder delivery (Phase 2)
--   * user_settings row for every user, plus digest bookkeeping
--   * repeating todos: completing one creates the next occurrence
--   * pg_cron calls the send-reminders Edge Function every 15 minutes
--
-- One-time setup per database (not in a migration, so no secret is in git).
-- Run in the SQL editor, with the same secret as the function's CRON_SECRET:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random string>', 'reminders_cron_secret');
-- Locally, project_url is 'http://host.docker.internal:54321'.
-- =====================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- user_settings: one row per user, created with the account.
-- ---------------------------------------------------------------------
alter table public.user_settings add column digest_last_sent_on date;

create or replace function public.create_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_settings after insert on auth.users
  for each row execute function public.create_user_settings();

insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- Repeating todos. Completing one adds the next occurrence as a new todo
-- (which gets its own reminder through todos_sync_reminder). The finished
-- row stops repeating, so un-checking and re-checking it adds no copy.
-- Dates step in the user's time zone so "monthly" keeps the day of month.
-- ---------------------------------------------------------------------
create or replace function public.repeat_completed_todo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  step interval := case new.repeat
                     when 'daily'   then interval '1 day'
                     when 'weekly'  then interval '7 days'
                     when 'monthly' then interval '1 month'
                   end;
  tz text;
  anchor timestamp;
  k integer := 1;
begin
  if step is null or coalesce(new.due_at, new.remind_at) is null then
    return new;
  end if;

  select timezone into tz from user_settings where user_id = new.user_id;
  tz := coalesce(tz, 'Asia/Manila');
  anchor := coalesce(new.due_at, new.remind_at) at time zone tz;

  -- First occurrence after now, counted from the original date.
  while (anchor + k * step) at time zone tz <= now() loop
    k := k + 1;
  end loop;

  insert into todos (user_id, title, notes, priority, due_at, remind_at, repeat)
  values (
    new.user_id, new.title, new.notes, new.priority,
    ((new.due_at at time zone tz) + k * step) at time zone tz,
    ((new.remind_at at time zone tz) + k * step) at time zone tz,
    new.repeat
  );

  new.repeat := 'none';
  return new;
end;
$$;

create trigger todos_repeat_on_complete
  before update of completed_at on public.todos
  for each row
  when (old.completed_at is null and new.completed_at is not null and new.repeat <> 'none')
  execute function public.repeat_completed_todo();

-- ---------------------------------------------------------------------
-- Every 15 minutes: send due reminders (Expo Push) and daily digests
-- (Resend). The function checks the x-cron-secret header.
-- ---------------------------------------------------------------------
select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
