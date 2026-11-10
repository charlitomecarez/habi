# Weather

The app calls Open-Meteo directly, with no key, because weather is a public fact. `lib/weather.ts` holds the calls, and AsyncStorage keeps the saved place and the last forecast on the phone for 30 minutes. A failed update keeps the last forecast, and the screen says so.

`Use my location` asks for permission only when you tap it, through `lib/location.ts`. The app works when you refuse. Open-Meteo has no typhoon signals.

The free plan allows under 10,000 calls a day, for non-commercial use.

## Icons

`weatherIcon()` turns a WMO code into an Ionicons name. Clear and partly cloudy nights show the moon. Icons use the `daily` colour, or `on-shell` on the Home line. They are never status colours, and the word or the numbers beside them always say the same thing. A forecast saved before this change has no code, so it shows no icon until the next update.

## World

Weather has a World section after Next 3 days. It starts with Hong Kong, Tokyo, Rome, Los Angeles and New York (`DEFAULT_WORLD`), and holds up to 6 places.

- `useWorldWeather()` fetches every place in one Open-Meteo call, with `timezone=auto`, so each reply has the place's own day and UTC offset. The places and the last world forecast stay in AsyncStorage, like your own place, with the same 30-minute freshness and the same stale notice.
- `localTime()` gives each place's clock from the saved offset. When the place's date is not your date, the time starts with Yesterday or Tomorrow. The section moves the clock each minute.
- `/weather/world` adds and removes places. It reuses the place search (`components/weather/usePlaceSearch.ts`) with `world`, which drops the Philippines filter. Each change saves at once. After a remove, Undo shows for 8 seconds. At 6 places the search turns off.
