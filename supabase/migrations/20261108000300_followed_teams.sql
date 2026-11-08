-- The teams each account follows, as league:team, for example PL:Arsenal (v1.4.0 milestone 9).
-- Home shows their last result and next match. user_settings already has apply_owner_rls.
alter table public.user_settings
  add column followed_teams text[] not null default '{}'
    check (cardinality(followed_teams) <= 12);
