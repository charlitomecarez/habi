-- =====================================================================
-- Journal: one short entry per day, with a mood and an optional photo.
-- Plain text protected by RLS (not the Vault). The photo goes in the
-- private user-files bucket under <user_id>/journal/.
-- =====================================================================

create type public.journal_mood as enum ('great', 'good', 'okay', 'low', 'bad');

create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  on_date     date not null,
  mood        public.journal_mood,
  body        text not null default '' check (length(body) <= 20000),
  photo_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, on_date)
);
create trigger journal_entries_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.journal_entries');
