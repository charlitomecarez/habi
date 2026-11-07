# my-app

![my-app on Android: the money, todos, home, vehicle and vault screens](docs/images/readme-banner.png)

my-app is a personal app for its admin and the few people the admin adds. Sign-up is off, and each account has fully separate data. It runs on Android first and on the web second.

The tabs are Home, Money, Todos, Vehicle and More.

- **Home:** one sentence on what needs you, the week band for money, todos, habits and sleep, then today's rows. It also shows the weather, your steps and your screen time. Steps, sleep and screen time stay on the phone.
- **Money:** accounts, transactions, bills, budgets, savings goals, subscriptions, recurring expenses and income, and exchange rates.
- **Statement import:** reads GoTyme, GCash and MariBank PDF statements. You review the rows before the app saves them.
- **Todos:** tasks with due dates, repeats and reminders.
- **Vehicle:** the odometer, the service schedule, the service log and fuel logs. The default vehicle is a Honda ADV 160.

The More tab holds the other modules:

- **Daily life:** Habits, Gym, Journal, Health (medicine, doctor visits, steps and sleep), Alarms, Ulam (a daily dish under your limit, with a photo) and Sports (five football leagues and the NBA).
- **People:** People and dates (birthdays, yearly dates and gift ideas), Debts, and Inbox (voice messages with text).
- **Home and plans:** Inventory (items, photos, locations, warranties and QR box labels), Shopping list and Travel.
- **Records and work:** Find a work (admin only), Documents (expiry dates, renewal reminders and encrypted photos), Vault (passwords encrypted on the phone) and Content planner.

Android also has two home screen widgets, Sleep and Screen time. Report a bug is on More.

## Install on Android

The APK comes from Build from GitHub in expo.dev. It is not on the Play Store. From v1.3.0, GitHub releases hold only the source code.

1. On the phone, sign in to expo.dev and open the latest `production` build.
2. Download the APK.
3. Open the APK file.
4. If Android asks, allow installs from that app.
5. Tap **Install**.
6. Open my-app and sign in with Google.

To update, install the APK from a newer build over the current app. Your data stays in Supabase.

## Stack

- Expo SDK 58 with expo-router.
- TypeScript, NativeWind 4 and the Schibsted Grotesk font.
- Supabase: Postgres with RLS, Auth, Storage, Edge Functions, pg_cron and pg_net.
- @tanstack/react-query, zustand, react-hook-form with zod, and date-fns.
- Expo Push for notifications. Resend for email. The Gemini API free tier for the daily tip. The Groq free plan for the daily ulam, voice text and Find a work.
- Open-Meteo for weather, football-data.org and balldontlie for sports, freehire for jobs, and Wikimedia Commons for ulam photos.
- Health Connect for steps, and `react-native-android-widget` for the widgets.
- react-native-libsodium for the vault (Argon2id and XChaCha20-Poly1305).
- pdfjs-dist in the `import-statement` and `job-profile-draft` Edge Functions.
- A daily encrypted database backup in GitHub Actions.

## Requirements

- Node 22. The version is in `.nvmrc`.
- An expo.dev account connected to this GitHub repository, for APK builds.

The Supabase CLI is a dev dependency, so run it with `npx supabase`. Docker and a local Supabase server are not used. See [docs/conventions.md](docs/conventions.md).

## Set up

1. Install the packages:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env`.
3. Fill in the three values in `.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

These three values are safe in the app bundle. Never give any other value the `EXPO_PUBLIC_` prefix, and never commit a secret.

## Run the app

```sh
npm run web
```

Stop the dev server when you finish.

## Database

The schema is in `supabase/migrations/`. Every user-owned table has row-level security.

1. Link the project:

   ```sh
   npx supabase link --project-ref <project-ref>
   ```

2. Apply the migrations:

   ```sh
   npx supabase db push --remote
   ```

3. Generate the types:

   ```sh
   npm run db:types
   ```

Add a new migration file for each schema change. Do not edit a migration that is already applied.

## Edge Functions

| Function           | What it does                                          | How it runs                               |
| ------------------ | ----------------------------------------------------- | ----------------------------------------- |
| `send-reminders`   | Sends push notifications and one digest email per day | pg_cron, every 15 minutes                 |
| `daily-tip`        | Stores one short tip from the Gemini API              | pg_cron, each day at 12:00 AM Manila time |
| `import-statement` | Reads one PDF statement in memory and stores nothing  | The app, for a signed-in user             |

1. Set the function secrets:

   ```sh
   npx supabase secrets set CRON_SECRET=<random string> RESEND_API_KEY=<key> GEMINI_API_KEY=<key> GOTYME_KEY=<key> GCASH_KEY=<key>
   ```

2. Deploy the functions:

   ```sh
   npx supabase functions deploy send-reminders --use-api
   npx supabase functions deploy daily-tip --use-api
   npx supabase functions deploy import-statement --use-api
   ```

3. In the Supabase SQL editor, store the project URL and the same cron secret:

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<random string>', 'reminders_cron_secret');
   ```

The Google client secret, the Resend API key, the Gemini API key, the PDF keys and the service-role key stay in the Supabase dashboard or the function secrets. Never put them in the app or the repository.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npx prettier --check .
```

Run these one at a time, because the development Mac has 8 GB of RAM. Vitest runs the tests in `lib/**/*.test.ts`. The type check and the tests skip `supabase/functions`.

After you add a route, run `npx expo start --port 8099` for a few seconds and stop it. This refreshes the route types for the type check.

## Builds

Build the APK only with Build from GitHub in expo.dev. Do not build on the Mac, and do not use the `eas build` command. Start a new build after you add a package with native code.

The build profiles are in `eas.json`:

- `development`: a development client for internal use.
- `preview`: an APK for internal use.
- `production`: a release APK. It stays in expo.dev. Do not attach it to a GitHub release.

## Project layout

- `app/(auth)/`: the sign-in screen. It is the only public screen.
- `app/(app)/`: the protected screens. The tabs are Home, Money, Todos, Vehicle and More.
- `components/ui/`: the shared components. Build screens from these.
- `components/<module>/`: the forms and parts for one module.
- `lib/`: data hooks and helpers for each module. Android-only APIs use a `name.ts` and `name.web.ts` pair.
- `providers/`: the auth and query providers.
- `supabase/`: the migrations and the Edge Functions.
- `tailwind.config.js` and `global.css`: the design tokens for the light and dark themes.

## Vault security

The phone encrypts each vault entry before it goes to Supabase. The key comes from the master password with Argon2id. Supabase never gets the plaintext or the key. Nobody can reset a forgotten master password.
