-- A team's crest and short code. football-data.org sends both. balldontlie sends only the code,
-- so the crest stays empty for the NBA. Both tables keep their RLS: only sports-sync writes.
alter table public.sports_matches
  add column home_crest text,
  add column away_crest text,
  add column home_code  text,
  add column away_code  text;

alter table public.sports_standings
  add column crest text,
  add column code  text;
