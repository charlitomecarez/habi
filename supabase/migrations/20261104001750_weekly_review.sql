-- =====================================================================
-- Weekly review: one shared query for the Home card and both emails
-- (the Sunday "Your week" email and the section in the Sunday digest),
-- so they always show the same numbers. Weeks run Monday to Sunday in
-- the user's time zone.
--   weekly_review(week_start)          the app, for the signed-in user
--   weekly_review_for(user, week_start) the send-reminders function
-- =====================================================================

alter table public.user_settings add column weekly_review_last_sent_on date;

create or replace function public.weekly_review_for(p_user_id uuid, p_week_start date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  tz text;
  ws date := date_trunc('week', p_week_start)::date;   -- Monday
  we date := ws + 6;                                    -- Sunday
  ws_at timestamptz;
  we_at timestamptz;
  result jsonb;
begin
  select timezone into tz from user_settings where user_id = p_user_id;
  tz := coalesce(tz, 'Asia/Manila');
  ws_at := ws::timestamp at time zone tz;
  we_at := (we + 1)::timestamp at time zone tz;

  select jsonb_build_object(
    'week_start', ws,
    'week_end', we,
    'spent', (select coalesce(sum(amount), 0) from transactions
               where user_id = p_user_id and kind = 'expense' and occurred_on between ws and we),
    'income', (select coalesce(sum(amount), 0) from transactions
                where user_id = p_user_id and kind = 'income' and occurred_on between ws and we),
    'budgets', coalesce((
      select jsonb_agg(jsonb_build_object('category', c.name, 'available', bm.available, 'spent', bm.spent) order by c.sort_order)
        from money_budgets b
        join money_categories c on c.id = b.category_id
        cross join lateral budget_month(b.id, we) bm
       where b.user_id = p_user_id), '[]'::jsonb),
    'todos_done', (select count(*) from todos
                    where user_id = p_user_id and completed_at >= ws_at and completed_at < we_at),
    'todos_overdue', (select count(*) from todos
                       where user_id = p_user_id and completed_at is null and due_at < now()),
    'next_service', (
      select jsonb_build_object('item', d.item, 'status', d.status, 'km_remaining', d.km_remaining, 'days_remaining', d.days_remaining)
        from vehicle_service_due d
       where d.user_id = p_user_id and d.status in ('overdue', 'due_soon', 'ok')
       order by case d.status when 'overdue' then 0 when 'due_soon' then 1 else 2 end,
                d.km_remaining nulls last, d.days_remaining nulls last
       limit 1),
    'videos_due', coalesce((
      select jsonb_agg(jsonb_build_object('title', v.title, 'publish_on', v.publish_on, 'stage', v.stage) order by v.publish_on)
        from content_videos v
       where v.user_id = p_user_id and v.stage <> 'published' and v.publish_on <= we + 7), '[]'::jsonb),
    'videos_published', (select count(*) from content_videos
                          where user_id = p_user_id and stage = 'published' and updated_at >= ws_at and updated_at < we_at),
    'habits', coalesce((
      select jsonb_agg(jsonb_build_object('name', h.name, 'done', (
               select count(*) from habit_checks hc where hc.habit_id = h.id and hc.on_date between ws and we)) order by h.created_at)
        from habits h
       where h.user_id = p_user_id and not h.archived), '[]'::jsonb),
    'gym_trained', (select count(*) from workout_sessions
                     where user_id = p_user_id and on_date between ws and we),
    'gym_planned', (select count(*) from workout_plans p
                     cross join generate_series(ws, we, interval '1 day') g(d)
                     where p.user_id = p_user_id and not p.archived
                       and extract(dow from g.d)::smallint = any (p.weekdays))
  ) into result;
  return result;
end;
$$;
revoke execute on function public.weekly_review_for(uuid, date) from public, anon, authenticated;
grant execute on function public.weekly_review_for(uuid, date) to service_role;

-- The app's entry point: always the signed-in user.
create or replace function public.weekly_review(p_week_start date default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select weekly_review_for(
    auth.uid(),
    coalesce(p_week_start,
             (now() at time zone coalesce((select timezone from user_settings where user_id = auth.uid()), 'Asia/Manila'))::date)
  );
$$;
revoke execute on function public.weekly_review(date) from public, anon;
grant execute on function public.weekly_review(date) to authenticated;
