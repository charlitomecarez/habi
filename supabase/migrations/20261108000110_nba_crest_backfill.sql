-- NBA logos for rows that sports-sync stored before it had them (v1.4.0 milestone 3).
-- Data only. sports-sync fills new rows itself; this fills the season that it no longer fetches.
-- The map matches nbaCrest in supabase/functions/_shared/sports.ts.

with logo(code, url) as (
  select code, 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/' || slug || '.png&h=96&w=96'
  from (values
    ('ATL', 'atl'),
    ('BOS', 'bos'),
    ('BKN', 'bkn'),
    ('CHA', 'cha'),
    ('CHI', 'chi'),
    ('CLE', 'cle'),
    ('DAL', 'dal'),
    ('DEN', 'den'),
    ('DET', 'det'),
    ('GSW', 'gs'),
    ('HOU', 'hou'),
    ('IND', 'ind'),
    ('LAC', 'lac'),
    ('LAL', 'lal'),
    ('MEM', 'mem'),
    ('MIA', 'mia'),
    ('MIL', 'mil'),
    ('MIN', 'min'),
    ('NOP', 'no'),
    ('NYK', 'ny'),
    ('OKC', 'okc'),
    ('ORL', 'orl'),
    ('PHI', 'phi'),
    ('PHX', 'phx'),
    ('POR', 'por'),
    ('SAC', 'sac'),
    ('SAS', 'sa'),
    ('TOR', 'tor'),
    ('UTA', 'utah'),
    ('WAS', 'wsh')
  ) as t(code, slug)
)
update public.sports_matches m
set home_crest = coalesce(m.home_crest, (select url from logo where logo.code = upper(m.home_code))),
    away_crest = coalesce(m.away_crest, (select url from logo where logo.code = upper(m.away_code)))
where m.league = 'NBA' and (m.home_crest is null or m.away_crest is null);

with logo(code, url) as (
  select code, 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/' || slug || '.png&h=96&w=96'
  from (values
    ('ATL', 'atl'),
    ('BOS', 'bos'),
    ('BKN', 'bkn'),
    ('CHA', 'cha'),
    ('CHI', 'chi'),
    ('CLE', 'cle'),
    ('DAL', 'dal'),
    ('DEN', 'den'),
    ('DET', 'det'),
    ('GSW', 'gs'),
    ('HOU', 'hou'),
    ('IND', 'ind'),
    ('LAC', 'lac'),
    ('LAL', 'lal'),
    ('MEM', 'mem'),
    ('MIA', 'mia'),
    ('MIL', 'mil'),
    ('MIN', 'min'),
    ('NOP', 'no'),
    ('NYK', 'ny'),
    ('OKC', 'okc'),
    ('ORL', 'orl'),
    ('PHI', 'phi'),
    ('PHX', 'phx'),
    ('POR', 'por'),
    ('SAC', 'sac'),
    ('SAS', 'sa'),
    ('TOR', 'tor'),
    ('UTA', 'utah'),
    ('WAS', 'wsh')
  ) as t(code, slug)
)
update public.sports_standings s
set crest = (select url from logo where logo.code = upper(s.code))
where s.league = 'NBA' and s.crest is null;
