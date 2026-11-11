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

- `source` is `typed` or `health_connect`. Each weight row on Health says "Typed" or "From Samsung Health", and keeps its delete button.
- On Android, `useWeightsFromHealthConnect` (`lib/health-weights.ts`) reads new Health Connect weights when the app opens or comes back to the front. The first sync reads 30 days. After that, a Health Connect changes token gives only new weights, so a weight that you delete in Habi does not come back. If the token expires, the app reads from the last sync. Sign-out clears the token.
- The app keeps the last weight of each day and saves it with `save_health_weights()`. A typed weight on the same day always wins. A typed log sets `source = 'typed'`, so it also replaces a Health Connect weight.

## Reminders

Source `medicine`. Each pending dose has its own push. Taken, Skipped or deleting removes it. The daily digest lists today's doses.

## Steps and sleep

- `lib/health-connect.ts` reads steps, sleep and weight through `react-native-health-connect`, and `.web.ts` is the adapter. Allow steps asks for `READ_STEPS`, `READ_SLEEP` and `READ_WEIGHT` on one Health Connect screen. A phone that allowed only steps in v1.4.0 sees an "Allow sleep and weight" notice and a secondary button. `minSdkVersion` is 26.
- When the app opens or comes back to the front, `useSleepFromPhone` reads last night's sleep. First it takes the longest Health Connect sleep session that ends between midnight and noon (`longestNightSession`). If there is none, it reads screen on and off events (`getScreenEvents` in `modules/screen-time`, Android 9 and later) from 8 PM to noon. `lib/sleep-detect.ts` joins dark stretches split by a screen check under 5 minutes, and takes the longest stretch of 3 hours or more. It needs the usage access that screen time already has.
- Each entry has a `source`: `health_connect`, `screen` or `typed`. The phone never writes over a typed entry, and an entry from v1.3.0 with no source counts as typed. The screen never replaces a Health Connect night. Before noon, an entry from the phone can grow. Editing an entry in the sheet makes it typed. Last night and Home say "From Samsung Health" for a Health Connect night.
- **This week:** Steps and sleep shows This week and Last week. `BarChart` draws a bar of hours for each night in its score colour, with a dashed line at 7 hours. A day ahead draws a flat line. Under it are the average length, the average score, the number of nights, the usual bedtime and wake time, and a row for each night, Monday first. A tap on a row edits that night.
- **Sleep score** (`lib/sleep-score.ts`), 0 to 100: length gives 70 points for 7 to 9 hours, less 10 for each 30 minutes under 7 hours or over 9. Bedtime gives 30 points within 45 minutes of the week's middle bedtime, less 10 for each 30 minutes more. 80 or more is Rested, 60 to 79 is Fair, under 60 is Poor. Last night and Home keep the length words Good, Short and Too short.
- The web, a phone with no usage access, and an APK older than v1.4.0 keep the typed sheet. `lib/sleep.ts` keeps 30 days in AsyncStorage, and sign-out clears it.
- Steps and sleep go to Supabase only when you turn on the 6 PM health check. A Health Connect weight saves to your account, like a typed weight.

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
