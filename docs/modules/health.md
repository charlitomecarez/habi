# Health

**Files:** `lib/health.ts`, `lib/secure-photos.ts`, `app/(app)/health/`, `components/health/`, migration `...001100_health`.

## Medicines

- `medicines` holds the times of day, a start date and an optional end date. `isActive` is true until the end date has passed.
- `medicine_doses` holds one row per scheduled dose, for today and the next two days. The hourly `fill-medicine-doses` job keeps it filled.
- Changing a medicine drops its future pending doses and writes them again.
- `useMarkDose` sets a dose to Taken or Skipped, or back to pending.

## Visits

- `health_visits` holds the date, doctor, reason and notes.
- `photo_paths` points to lab photos encrypted on the phone with the Vault key. Supabase stores only ciphertext, and the photos need an unlocked vault.

## Weight

`weight_logs` holds one row per day. A second log on the same day replaces it.

## Reminders

Source `medicine`. Each pending dose has its own push. Taken, Skipped or deleting removes it. The daily digest lists today's doses.

## Steps and sleep

- `lib/health-connect.ts` reads steps through `react-native-health-connect`, and `.web.ts` is the adapter. The app asks only for `READ_STEPS`, and `minSdkVersion` is 26.
- Sleep comes from the screen on Android. When the app opens or comes back to the front, `useSleepFromScreen` reads screen on and off events (`getScreenEvents` in `modules/screen-time`, Android 9 and later) from 8 PM to noon. `lib/sleep-detect.ts` joins dark stretches split by a screen check under 5 minutes, and takes the longest stretch of 3 hours or more. It needs the usage access that screen time already has.
- Each entry has a `source`: `screen` or `typed`. The screen never writes over a typed entry, and an entry from v1.3.0 with no source counts as typed. Before noon, a screen entry can grow. Editing a screen entry in the sheet makes it typed.
- The web, a phone with no usage access, and an APK older than v1.4.0 keep the typed sheet. `lib/sleep.ts` keeps 30 days in AsyncStorage, and sign-out clears it.
- Nothing here goes to Supabase, so this needs no table.

## Widgets

`widgets/` holds the Sleep and Screen time home screen widgets, through `react-native-android-widget`. `index.js` registers the headless task, so `package.json` `main` is `index.js`. Both read only data on the phone. Screen time shows no app names, because anyone can see a home screen. A signed-out phone shows nothing personal. Android refreshes them about every 30 minutes, and `lib/widgets.ts` redraws them after a save and after sign-out.
