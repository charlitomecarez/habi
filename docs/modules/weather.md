# Weather

The app calls Open-Meteo directly, with no key, because weather is a public fact. `lib/weather.ts` holds the calls, and AsyncStorage keeps the saved place and the last forecast on the phone for 30 minutes. A failed update keeps the last forecast, and the screen says so.

`Use my location` asks for permission only when you tap it, through `lib/location.ts`. The app works when you refuse. Open-Meteo has no typhoon signals.

The free plan allows under 10,000 calls a day, for non-commercial use.
