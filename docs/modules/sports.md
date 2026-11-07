# Sports

Sports shows matches and standings for the Premier League, La Liga, Ligue 1, Bundesliga, Liga Portugal and the NBA. It sends no notifications, and it shows no live scores.

- `sports-sync` runs at 7 AM and 3 PM PHT through `pg_cron`. The app never calls a sports API, so the keys stay in Edge Function secrets.
- football-data.org allows 10 calls a minute. One sync makes 10 calls, 7 seconds apart. balldontlie allows 5 calls a minute, and the two run side by side.
- `sports_matches`, `sports_standings` and `sports_sync` are shared. Signed-in accounts read them, and only the service role writes them.
- Football keeps 14 days back and 14 days ahead. The free balldontlie key has no standings, so the NBA keeps the season, and `nbaStandings` counts wins and losses. The screen says that the order is calculated.
- A failed league keeps its last good rows, and the screen says so.
- A match opens a web search for both teams, in the phone browser.
