# Sports

Sports shows matches and standings for the Premier League, La Liga, Ligue 1, Bundesliga, Liga Portugal and the NBA. It sends no notifications, and it shows no live scores.

- `sports-sync` runs at 7 AM and 3 PM PHT through `pg_cron`. The app never calls a sports API, so the keys stay in Edge Function secrets.
- football-data.org allows 10 calls a minute. One sync makes 10 calls, 7 seconds apart. balldontlie allows 5 calls a minute, and the two run side by side.
- `sports_matches`, `sports_standings` and `sports_sync` are shared. Signed-in accounts read them, and only the service role writes them.
- Football keeps 14 days back and 14 days ahead. The free balldontlie key has no standings, so the NBA keeps the season, and `nbaStandings` counts wins and losses. The screen says that the order is calculated.
- A failed league keeps its last good rows, and the screen says so.
- A match opens a web search for both teams, in the phone browser.

## Team marks

`sports-sync` stores each team's `crest` and short code. football-data.org sends both. balldontlie sends only the abbreviation, so `nbaCrest` maps the 30 NBA codes to ESPN's public logo images. An unknown code has no crest and shows its code. A crest that cannot load falls back to the code. The name is always beside the mark, so TalkBack skips the mark.

## Following teams

- "Teams you follow" under the league chips opens a sheet. League chips inside it switch the list, so you can pick teams in several leagues in one go. At 12 teams, the empty boxes turn off.
- `user_settings.followed_teams` holds `league:team`, for example `PL:Arsenal`, with the team name that `sports_matches` holds. The database stops a 13th team. It does not check the format, because only the owner writes the row and the app ignores a name it does not know.
- If a feed renames a team, its follow stops matching. The sheet shows it unticked, and you tick it again.
- Home shows Games after Shortcuts: for each followed team, the last result from the past 3 days and the next match, at most 3 rows, soonest to now first. With no team followed, one row opens this sheet. It reads only the followed leagues, and it loads after the attention rows.

## F1 and MotoGP

F1 and MotoGP are two chips after NBA. They need no key, so they work on any server that has the football keys.

- **Sources:** F1 comes from Jolpica (`api.jolpi.ca`). MotoGP comes from the public motogp.com results API, which has no documentation and can change with no notice.
- **Sync:** the `motor-sync` cron calls `sports-sync` with `{"only":"motor"}` every 2 hours. The function calls the sources only at 7 AM PHT, or when a race starts in the next 72 hours or started in the last 8 hours. `{"only":"motor","force":true}` calls them at once.
- **Failure:** a failed series writes `last_error_at` in `sports_sync` and keeps its rows. It never stops the other series or football. Sports then shows "Could not update" with the time of the last good data.
- **Views:** Races shows the next race, the top 10 of the last race and every round. Drivers (Riders for MotoGP) and Teams show the standings. The MotoGP API has no team table, so a team's points are the sum of its riders' points.
- **Times:** a race between midnight and 6 AM gets a second line, such as "Saturday night, at midnight".
- **Home:** the Show on Home switch saves the series in `user_settings.followed_series`. Home Games then shows the next race in the 7 days before it, and the winner for 3 days after it. Races and matches share the 3 rows, soonest to now first.
- **No push:** a race sends no notification.
