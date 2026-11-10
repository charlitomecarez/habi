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
- Nothing here goes to Supabase unless you turn on the 6 PM health check.

## 6 PM health check

The health check is off until each account turns it on (`user_settings.health_check`). The switch is at the end of Steps and sleep.

- **Turn on:** a sheet says what leaves the phone before it leaves. Then, on each app open (Home or Steps and sleep), `useHealthDaysSync` upserts one `health_days` row a day for the last 7 days: sleep minutes, bed and wake time, the sleep source and steps. A day with no sleep and no steps sends nothing. The web has no steps, so it sends sleep only.
- **5:45 PM:** the hourly `health-insight` job picks accounts with the check on, local time 5:45 to 5:59 PM, and no advice for today. `_shared/health-insight.ts` builds the prompt: one line of numbers a day and the weight trend ("down 0.4 kg over 9 days"), never a weight, a name, an email or an ID. Groq answers with 1 to 3 tips. `parseTips` rejects a tip over 200 characters, a weight in kilograms, or an illness, a diagnosis or a medicine, and the function asks once more with the problems.
- **Today has no numbers:** it uses the latest of the last 3 days, and the first tip says so. With no numbers in 3 days, it saves nothing and sends no push.
- **6:00 PM:** the function writes one `reminders` row (`source_type = 'health'`, title "Your health check is ready", no body), and `send-reminders` sends it. A tap opens Steps and sleep.
- **On screen:** after 6 PM, today's advice goes on top of Steps and sleep, and Home shows one row until midnight. Before 6 PM, yesterday's advice sits at the end. After 6:15 PM with no advice, a watch notice says why: no numbers in 3 days, or the AI service did not answer.
- **Turn off:** a `ConfirmSheet`, then `clear_health_check()` deletes this account's `health_days` and `health_insights` and turns the check off. The weight log and the sleep on the phone stay.
- **Logs:** counts and Groq status codes only, never a number or a tip. Turn on zero retention in the Groq Data Controls before the first account turns the check on.

## Widgets

`widgets/` holds the Sleep and Screen time home screen widgets, through `react-native-android-widget`. `index.js` registers the headless task, so `package.json` `main` is `index.js`. Both read only data on the phone. Screen time shows no app names, because anyone can see a home screen. A signed-out phone shows nothing personal. Android refreshes them about every 30 minutes, and `lib/widgets.ts` redraws them after a save and after sign-out.
