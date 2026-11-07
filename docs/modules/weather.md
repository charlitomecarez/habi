# Weather

The app calls Open-Meteo directly, with no key, because weather is a public fact. `lib/weather.ts` holds the calls, and AsyncStorage keeps the saved place and the last forecast on the phone for 30 minutes. A failed update keeps the last forecast, and the screen says so.

`Use my location` asks for permission only when you tap it, through `lib/location.ts`. The app works when you refuse. Open-Meteo has no typhoon signals.

The free plan allows under 10,000 calls a day, for non-commercial use.

## Icons

`weatherIcon()` turns a WMO code into an Ionicons name. Clear and partly cloudy nights show the moon. Icons use the `daily` colour, or `on-shell` on the Home line. They are never status colours, and the word or the numbers beside them always say the same thing. A forecast saved before this change has no code, so it shows no icon until the next update.
