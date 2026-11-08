-- Find a work: save jobs even when Groq cannot rank them (v1.4.0 milestone 2).
-- Destructive parts: two not null constraints are dropped and one index is rebuilt. No row changes.

alter table public.job_matches
  alter column score drop not null,
  alter column reason drop not null;

-- Unranked jobs sort after ranked ones.
drop index public.job_matches_user_score_idx;
create index job_matches_user_score_idx
  on public.job_matches (user_id, status, score desc nulls last);

-- Why the last run stopped. A short code, never job text.
alter table public.job_profiles
  add column last_error text
    check (last_error in ('groq_busy', 'search_down', 'failed'));
