-- =====================================================================
-- A video's tasks are todos with video_id, so they get Todos reminders.
-- =====================================================================

alter table public.todos
  add column video_id uuid references public.content_videos (id) on delete set null;
create index todos_video_idx on public.todos (video_id) where video_id is not null;

-- The video must be the same user's.
create or replace function public.check_todo_video()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.video_id is not null
     and not exists (select 1 from content_videos where id = new.video_id and user_id = new.user_id) then
    raise exception 'video % does not belong to this user', new.video_id using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger todos_check_video before insert or update of video_id on public.todos
  for each row execute function public.check_todo_video();
