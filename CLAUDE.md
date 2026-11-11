# Habi

Personal all-in-one app. The owner is the admin. Sign-up is off, so only people the admin adds can use the app, and each account has fully separate data. Only the admin decides who gets voice messages. It holds todos with reminders, vehicle maintenance, room inventory, money and subscriptions, password vault.

- Display name and GitHub repo: Habi (`charlitomecarez/habi`). The expo.dev slug, package and scheme stay `my-app` / `com.charli.myapp` / `myapp`.
- Android package: `com.charli.myapp` (app.json `android.package`; Google OAuth Android client IDs and FCM use it)
- URL scheme: `myapp`

## Stack

- Expo (expo-router, dev client) + TypeScript; Android first, web second, one codebase.
- Supabase: Postgres with RLS, Auth, Storage, Edge Functions, pg_cron + pg_net.
- Resend for email (Supabase SMTP sender + one daily digest). Expo Push for notifications.
- Groq free plan for the daily ulam, voice text, Find a work and the 6 PM health check. Only the `daily-ulam`, `voice-transcribe`, `job-search`, `job-profile-draft` and `health-insight` Edge Functions call it.
- NativeWind for styling; Schibsted Grotesk via @expo-google-fonts.
- Data: @supabase/supabase-js, @tanstack/react-query, zustand, react-hook-form + zod, date-fns.
- Everything must stay on free tiers.

## Environment

- `.env` (gitignored): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. These three are safe in the app bundle; nothing else is.
- Never put the Google client secret, Resend API key, Groq API key or Supabase service-role key in the app or the repo. They live only in the Supabase dashboard / Edge Function secrets.
- The daily database backup runs in a separate private repo, not in this one. See `docs/backup.md`.
- Supabase SMTP and the daily digest send email through Resend from a noreply address.

## Commands

- `npx expo start --web` for web.
- Build the APK only with Build from GitHub in expo.dev. Do not run `npx expo run:android`, `eas build` or any local Android build.
- `npm run typecheck`, `npm run lint` and `npm test` before each PR. Run them one at a time.
- This Mac has 8 GB of RAM. Run one heavy command at a time, and stop the dev server when you finish. For a web build check, use `npx expo export --platform web --max-workers 1`.
- `npx supabase db push --remote` for migrations. Do not use Docker or a local Supabase server. The CLI targets a local stack without `--remote`.
- Never run `supabase config push`. `supabase/config.toml` has a localhost `site_url` and differs from the live auth settings.
- `npm run db:types` after every migration. It reads the linked live project, so it needs no Docker.

## Rules

- Never write a migration without RLS: every user-owned table gets `user_id uuid not null default auth.uid()` and `select public.apply_owner_rls('public.<table>')`.
- Schema changes are new files in `supabase/migrations/`; never edit an applied migration.
- Only the reminder Edge Function sends notifications. Modules write rows to `reminders`. One exception: Alarms ring from the phone, through `modules/alarm/`, because a push can arrive late and needs internet.
- Vault data is encrypted on the device (libsodium Argon2id + XChaCha20-Poly1305). Never send plaintext or the key to Supabase, never log them.
- Android-only APIs live behind adapters: `name.ts` + `name.web.ts`. Screens never branch on `Platform.OS`.
- Statement PDF keys and the sports keys (`FOOTBALL_DATA_KEY`, `BALLDONTLIE_KEY`) live only in Edge Function secrets. Never give them the `EXPO_PUBLIC_` prefix.
- Never commit a real statement, or put real statement rows in a fixture.

## Design system

- Use token classes only (see `tailwind.config.js`). No hex codes or bare px values in screens.
- Build screens from shared components in `components/ui/`: Button, Input, AmountInput, Select, Segmented, Chip, Badge, Notice, Fab, TabBar, ModuleHeader, DataRow, BarChart, WeaveBand, Sheet, ModuleLine, EmptyState, Skeleton, FadeIn, PressScale, HabiMark, WeaveField, Snackbar.
- Motion uses the names in `lib/motion.ts`; a screen never sets a duration. Haptics go through `lib/haptics.ts`.
- At most one primary action per screen. Read-only screens have none. Indigo marks the shell and the primary action. The open tab is a cream pill on indigo.
- Section colours (`daily`, `people`, `home`, `records`) are for icons, tiles and the module icon in a header, never for status.
- Minimum touch target 48px; icon-only buttons need an accessibility label.
- Status always includes a word (Overdue, Today, Due soon), plus one colour: good (emerald), watch (saffron) or over (magenta). These colours never mean anything else. Gold on the shell is the brand (the mark and the stitch strip); a watch status always has its word.
- Cards are only for objects that you act on. Rows use 2 px rules and space.
- The assistant says "I" in its sentences and empty states. Buttons and labels stay plain.
- Sentence case; buttons name the action ("Save expense"). Optional fields say "(optional)".
- Borders, not shadows (only the FAB has a shadow). Inputs use 16px text.
- Errors never show the Supabase text. Use `ErrorNotice` or `errorText()` from `lib/errors.ts`.
- Full-screen form for more than three fields; bottom sheet for one or two.
- Every UI change consults Impeccable through the `ui-check` skill. `docs/design-system.md` has the steps.

## Navigation

- `app/(auth)/login.tsx` and `app/alarm-ringing.tsx` are the only public screens; `app/(app)/` is protected (Stack.Protected + onAuthStateChange). The ringing screen opens over the lock screen, so it shows no personal data.
- Tabs: Home · Money · Todos · Vehicle · More. More is a searchable grid of the other modules in sections (Daily life: Habits, Gym, Journal, Health, Alarms, Ulam, Sports, Movies, YouTube, Weather, News · People: People, Debts, Inbox · Home and plans: Inventory, Shopping, Travel · Records and work: Find a work (admin only), Documents, Vault, Content). `lib/modules.ts` lists them, and each tile shows how much is inside. Settings is laid out at the end of More.
- The app stack in `app/(app)/_layout.tsx` is the JS stack (`expo-router/js-stack`), set by `lib/transitions.ts` (`.web.ts` on the web): screens slide in and drag back from anywhere, and full-screen forms rise (`options={rise}`). A sideways scroller uses the gesture handler's `ScrollView`, so it does not start a drag back. A full-screen form uses `useDiscardGuard`.

## Releases

- Every release has five steps: Planning → Design → Handoff → Development → Farewell. `docs/release-workflow.md` has the full steps.
- Charli gates each step. Stop at the end of a step, and start the next step only when Charli asks.
- Design covers the UI and the DB of every milestone in the plan, unless a milestone does not need it. Charli can ask for revisions, and each revision follows the Impeccable rules.
- Each artifact name holds the version: `Habi v<version> plan`, `Habi v<version> design`, `Habi v<version> handoff`, `Habi v<version> release notes`.
- Link each artifact in `docs/releases/v<version>.md` and `docs/releases/index.md` as soon as you publish it.
- `CHANGELOG.md` has a short entry for each release. Add each change to `Unreleased` during Development.
- A GitHub release holds only the source code archives. Never attach the APK.
- Project skills and agents are in `.claude/`. `docs/conventions.md` lists them.

## Phases

1 Foundation (sign in with Google on Android and web) → 2 Todo + reminders → 3 Vehicle → 4 Inventory → 5 Money → 6 Vault → 7 Release. Each phase has a "done when" check in the handoff page; finish it before moving on.
