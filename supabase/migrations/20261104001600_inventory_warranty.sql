-- =====================================================================
-- Warranties and receipts on inventory items.
--   * acquired_on (already there) is the purchase date; price,
--     receipt_path (a photo in user-files/<user>/receipts/) and
--     warranty_ends_on are new.
--   * A reminder at 9:00 local time one month before the warranty ends.
-- =====================================================================

alter table public.inventory_items
  add column price numeric(12, 2) check (price >= 0),
  add column receipt_path text,
  add column warranty_ends_on date;

alter type public.reminder_source add value if not exists 'inventory';

create or replace function public.sync_warranty_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
begin
  if tg_op = 'DELETE' then
    delete from reminders where source_type = 'inventory' and source_id = old.id and sent_at is null;
    return old;
  end if;
  if new.warranty_ends_on is null or new.warranty_ends_on < current_date then
    delete from reminders where source_type = 'inventory' and source_id = new.id and sent_at is null;
    return new;
  end if;
  select timezone into tz from user_settings where user_id = new.user_id;
  tz := coalesce(tz, 'Asia/Manila');
  insert into reminders (user_id, source_type, source_id, title, body, remind_at)
  values (new.user_id, 'inventory', new.id,
          new.name || ' warranty ends ' || to_char(new.warranty_ends_on, 'Mon FMDD'),
          'Check it and claim the warranty before it ends.',
          greatest(((new.warranty_ends_on - interval '1 month')::date::timestamp + time '09:00') at time zone tz, now()))
  on conflict (source_type, source_id) where sent_at is null and source_id is not null
  do update set title = excluded.title, body = excluded.body, remind_at = excluded.remind_at;
  return new;
end;
$$;

create trigger inventory_items_sync_warranty_reminder
  after insert or update of name, warranty_ends_on or delete on public.inventory_items
  for each row execute function public.sync_warranty_reminder();
