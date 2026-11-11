# Contributing

This page sets up your own copy of Habi from nothing: your own Supabase project, your own Google sign-in and your own Firebase project for push notifications. Nothing here uses the owner's accounts, and everything stays on free tiers.

Read [CLAUDE.md](CLAUDE.md) and [docs/conventions.md](docs/conventions.md) before you change code. They hold the project rules.

## What you need

- Node 22 (`.nvmrc`) and npm.
- A Supabase account (free plan).
- A Google Cloud project, for Google sign-in.
- A Firebase project, for Android push notifications.
- An expo.dev account, for APK builds.
- Optional keys for the parts that use them: Resend (email), Groq (ulam, voice text, Find a work), Gemini (daily tip), football-data.org and balldontlie (Sports). A module with no key hides itself: the `app-features` function tells the app which keys are set (yes or no, never the key), and Sports, Find a work and Inbox leave More until you add theirs. News and Weather need no key.

Docker and a local Supabase server are not used. Every database command runs against your live project with `--remote`.

## 1. Get the code

```sh
git clone https://github.com/charlitomecarez/habi.git
cd habi
npm install
cp .env.example .env
```

## 2. Supabase

1. Create a project in the Supabase dashboard. Note its project ref and region.
2. Link and apply every migration. The migrations turn on `pg_cron` and `pg_net` themselves.

   ```sh
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push --remote
   npm run db:types
   ```

3. In `.env`, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from Project Settings › API.
4. Turn off sign-ups (Authentication › Sign In / Providers), so only the people you add can sign in.
5. Store the project URL and a cron secret for the scheduled jobs, in the SQL editor:

   ```sql
   select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<a long random string>', 'reminders_cron_secret');
   ```

6. Make yourself the admin. Sign in once (step 3), then run this in the SQL editor with your user id from Authentication › Users:

   ```sql
   insert into public.app_admins (user_id) values ('<your-user-id>');
   ```

Never run `npx supabase config push`. `supabase/config.toml` is for a local stack: it has a localhost `site_url` and would overwrite your live auth settings.

## 3. Google sign-in

1. In Google Cloud › APIs and services › Credentials, create an OAuth client of type **Web application**. Add `https://<your-project-ref>.supabase.co/auth/v1/callback` as a redirect URI.
2. Create an OAuth client of type **Android** with the package name `com.charli.myapp` (or your own, set in `app.json`) and the SHA-1 of your signing key from expo.dev.
3. In Supabase › Authentication › Providers › Google, paste the web client id and its secret.
4. In `.env`, set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the web client id.

The client secret goes only in the Supabase dashboard. It never goes in `.env` or the repo.

## 4. Firebase and push notifications

Each copy brings its own Firebase project. `google-services.json` is gitignored and is not in the git history.

1. Create a Firebase project and add an Android app with the same package name.
2. Download `google-services.json` and put it at the repo root. `app.config.ts` reads it from there for local work.
3. For expo.dev builds, upload the file as a **file** environment variable named `GOOGLE_SERVICES_JSON` (expo.dev › your project › Environment variables). EAS uploads only tracked files, so the build reads the path from that variable.
4. Upload your Firebase service account key (FCM V1) under expo.dev › Credentials › Android, so Expo Push can deliver.

## 5. Edge Functions

1. Set the secrets you have. Each one is optional except `CRON_SECRET`, which must equal `reminders_cron_secret` from step 2.5:

   ```sh
   npx supabase secrets set CRON_SECRET=<same random string> RESEND_API_KEY=<key> GROQ_API_KEY=<key> GEMINI_API_KEY=<key> FOOTBALL_DATA_KEY=<key> BALLDONTLIE_KEY=<key> TMDB_KEY=<key> GEOAPIFY_KEY=<key>
   ```

   Statement import also reads `GOTYME_KEY` and `GCASH_KEY`, the passwords of your own bank PDFs. Leave them out if you do not import statements.

2. Deploy every function:

   ```sh
   npx supabase functions deploy --use-api
   ```

3. For email, set Supabase › Authentication › SMTP to your Resend sender, and paste each file in `supabase/templates/` into Authentication › Email Templates.

The README table lists each function and its schedule. The schedules live in the migrations, so step 2.2 created them.

## 6. Run and build

```sh
npm run web
```

Android-only parts (widgets, Health Connect, screen time, sleep, alarms) need an APK. Build one from GitHub in expo.dev with the `preview` profile, then install it. Stop the dev server when you finish.

## Before a pull request

Run these one at a time:

```sh
npm run typecheck
npm run lint
npm test
```

- Every user-owned table needs `user_id uuid not null default auth.uid()` and `select public.apply_owner_rls('public.<table>')`. Add a new migration file; never edit an applied one.
- UI uses the tokens and the shared components in `components/ui/`. See [docs/design-system.md](docs/design-system.md).
- Never commit `.env`, a key, a real bank statement or real statement rows.
- Commit messages follow Conventional Commits, for example `fix(news): skip a feed that times out`.
