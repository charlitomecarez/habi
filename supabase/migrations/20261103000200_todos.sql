-- =====================================================================
-- Todos
-- =====================================================================

create type public.todo_repeat as enum ('none', 'daily', 'weekly', 'monthly');

create table public.todos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (length(title) between 1 and 300),
  notes         text,
  priority      smallint not null default 2 check (priority between 1 and 3), -- 1 high, 2 normal, 3 low
  due_at        timestamptz,
  remind_at     timestamptz,
  repeat        public.todo_repeat not null default 'none',
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index todos_user_open_idx on public.todos (user_id, due_at) where completed_at is null;
create trigger todos_updated_at before update on public.todos
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.todos');

-- Keeps one pending reminder in sync with each open todo's remind_at.
-- security definer so it can write reminders regardless of caller; it only
-- ever writes rows for the todo's own user_id.
create or replace function public.sync_todo_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from reminders
     where source_type = 'todo' and source_id = old.id and sent_at is null;
    return old;
  end if;

  if new.remind_at is null or new.completed_at is not null then
    delete from reminders
     where source_type = 'todo' and source_id = new.id and sent_at is null;
  else
    insert into reminders (user_id, source_type, source_id, title, body, remind_at)
    values (new.user_id, 'todo', new.id, new.title, new.notes, new.remind_at)
    on conflict (source_type, source_id) where sent_at is null and source_id is not null
    do update set title = excluded.title,
                  body = excluded.body,
                  remind_at = excluded.remind_at;
  end if;
  return new;
end;
$$;

create trigger todos_sync_reminder
  after insert or update of title, notes, remind_at, completed_at or delete
  on public.todos
  for each row execute function public.sync_todo_reminder();
