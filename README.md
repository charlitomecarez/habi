# my-app

![my-app on Android: the money, todos, home, vehicle and vault screens](docs/images/readme-banner.png)

my-app is a personal app for one user. It runs on Android first and on the web second, from one codebase.

It has these modules:

- **Todos:** tasks with due dates, repeats and reminders.
- **Vehicle:** the odometer, the service schedule and the service log. The default vehicle is a Honda ADV 160.
- **Inventory:** the things in your room, with photos, locations and QR box labels.
- **Money:** accounts, balances, transactions, subscriptions and exchange rates.
- **Vault:** passwords, encrypted on the phone with a master password.

## Stack

- Expo SDK 58 with expo-router and a development build (not Expo Go).
- TypeScript, NativeWind 4 and the Plus Jakarta Sans font.
- Supabase: Postgres with RLS, Auth, Storage, Edge Functions, pg_cron and pg_net.
- @tanstack/react-query, zustand, react-hook-form with zod, and date-fns.
- Expo Push for notifications. Resend for email.
- react-native-libsodium for the vault (Argon2id and XChaCha20-Poly1305).

## Requirements

- Node 22. The version is in `.nvmrc`.
- The Android SDK and a JDK, for Android builds.
- The Supabase CLI, for migrations and the Edge Function.
- The EAS CLI, for cloud builds (optional).

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

These three values are safe in the app bundle. Do not add other secrets to `.env` or to the repository.

## Run the app

Android development build:

```sh
npm run android
```

Web:

```sh
npm run web
```

Make a new development build after you add a package with native code.

## Database

The schema is in `supabase/migrations/`. Every user-owned table has row-level security.

1. Link the project:

   ```sh
   supabase link --project-ref <project-ref>
   ```

2. Apply the migrations:

   ```sh
   supabase db push
   ```

3. Generate the types:

   ```sh
   supabase gen types typescript --linked > types/database.ts
   ```

Add a new migration file for each schema change. Do not edit a migration that is already applied.

## Reminders and the daily digest

The `send-reminders` Edge Function sends push notifications and one digest email per day. pg_cron calls it every 15 minutes.

1. Set the function secrets:

   ```sh
   supabase secrets set CRON_SECRET=<random string> RESEND_API_KEY=<key>
   ```

2. Deploy the function:

   ```sh
   supabase functions deploy send-reminders
   ```

3. In the Supabase SQL editor, store the project URL and the same cron secret:

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<random string>', 'reminders_cron_secret');
   ```

The Google client secret, the Resend API key and the service-role key stay in the Supabase dashboard. Never put them in the app or the repository.

## Checks

```sh
npm run typecheck
npm run lint
npx prettier --check .
```

## Builds

The EAS profiles are in `eas.json`:

- `development`: a development client for internal use.
- `preview`: an APK for internal use.
- `production`: a store build.

```sh
eas build --platform android --profile preview
```

## Project layout

- `app/(auth)/`: the sign-in screen. It is the only public screen.
- `app/(app)/`: the protected screens. The tabs are Home, Money, Todos, Vehicle and More.
- `components/ui/`: the shared components. Build screens from these.
- `components/<module>/`: the forms and parts for one module.
- `lib/`: data hooks and helpers for each module. Android-only APIs use a `name.ts` and `name.web.ts` pair.
- `providers/`: the auth and query providers.
- `supabase/`: the migrations and the Edge Function.
- `tailwind.config.js` and `global.css`: the design tokens for the light and dark themes.

## Vault security

The phone encrypts each vault entry before it goes to Supabase. The key comes from the master password with Argon2id. Supabase never gets the plaintext or the key. Nobody can reset a forgotten master password.
