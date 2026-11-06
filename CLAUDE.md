# my-app

Personal all-in-one app for Charli (Philippines, Asia/Manila), the admin. Anyone can create an account, and each account has fully separate data. Only the admin decides who gets voice messages. It holds todos with reminders, vehicle maintenance (Honda ADV 160 default), room inventory, money and subscriptions, password vault.

- Display name: my-app
- Android package: `com.charli.myapp` (app.json `android.package`; Google OAuth Android client IDs and FCM use it)
- URL scheme: `myapp`

## Stack

- Expo (expo-router, dev client) + TypeScript; Android first, web second, one codebase.
- Supabase: Postgres with RLS, Auth, Storage, Edge Functions, pg_cron + pg_net.
- Resend for email (Supabase SMTP sender + one daily digest). Expo Push for notifications.
- Groq free plan for the daily ulam and voice text. Only the `daily-ulam` and `voice-transcribe` Edge Functions call it.
- NativeWind for styling; Plus Jakarta Sans via @expo-google-fonts.
- Data: @supabase/supabase-js, @tanstack/react-query, zustand, react-hook-form + zod, date-fns.
- Everything must stay on free tiers.

## Environment

- `.env` (gitignored): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. These three are safe in the app bundle; nothing else is.
- Never put the Google client secret, Resend API key, Groq API key or Supabase service-role key in the app or the repo. They live only in the Supabase dashboard / Edge Function secrets.
- Email sender (Supabase SMTP via Resend): noreply@email.blabbun.com.

## Commands

- `npx expo start --web` for web.
- Build the APK only with Build from GitHub in expo.dev. Do not run `npx expo run:android`, `eas build` or any local Android build.
- `npm run typecheck`, `npm run lint` and `npm test` before each PR. Run them one at a time.
- This Mac has 8 GB of RAM. Run one heavy command at a time, and stop the dev server when you finish. For a web build check, use `npx expo export --platform web --max-workers 1`.
- `npx supabase db push --remote` for migrations. Do not use Docker or a local Supabase server. The CLI targets a local stack without `--remote`.
- `npm run db:types` after every migration. It reads the linked live project, so it needs no Docker.

## Rules

- Never write a migration without RLS: every user-owned table gets `user_id uuid not null default auth.uid()` and `select public.apply_owner_rls('public.<table>')`.
- Schema changes are new files in `supabase/migrations/`; never edit an applied migration.
- Only the reminder Edge Function sends notifications. Modules write rows to `reminders`. One exception: Alarms ring from the phone, through `modules/alarm/`, because a push can arrive late and needs internet.
- Vault data is encrypted on the device (libsodium Argon2id + XChaCha20-Poly1305). Never send plaintext or the key to Supabase, never log them.
- Android-only APIs live behind adapters: `name.ts` + `name.web.ts`. Screens never branch on `Platform.OS`.
- Statement PDF keys live only in Edge Function secrets. Never give them the `EXPO_PUBLIC_` prefix.
- Never commit a real statement, or put real statement rows in a fixture.

## Design system

- Use token classes only (see `tailwind.config.js`). No hex codes or bare px values in screens.
- Build screens from shared components in `components/ui/`: Button, Input, AmountInput, Select, Segmented, Chip, Badge, Notice, Fab, TabBar, ScreenHeader, Sheet, HeroCard, ModuleTile, EmptyState, FadeIn, PressScale.
- One primary action per screen. Accent (#0F766E) marks the primary action, the open tab and the one Today card on Home.
- Section colours (`daily`, `people`, `home`, `records`) are for icons and tiles only, never for status.
- Minimum touch target 44px; icon-only buttons need an accessibility label.
- Status always includes a word (Overdue, Today, Due soon), not colour alone.
- Sentence case; buttons name the action ("Save expense"). Optional fields say "(optional)".
- Borders, not shadows (only the FAB has a shadow). Inputs use 16px text.
- Full-screen form for more than three fields; bottom sheet for one or two.
- Every UI change consults Impeccable through the `ui-check` skill. `docs/design-system.md` has the steps.

## Navigation

- `app/(auth)/login.tsx` and `app/alarm-ringing.tsx` are the only public screens; `app/(app)/` is protected (Stack.Protected + onAuthStateChange). The ringing screen opens over the lock screen, so it shows no personal data.
- Tabs: Home · Money · Todos · Vehicle · More. More is a searchable grid of the other modules in sections (Daily life: Habits, Gym, Journal, Health, Alarms, Ulam · People: People, Debts, Inbox · Home and plans: Inventory, Shopping, Travel · Records and work: Documents, Vault, Content). `lib/modules.ts` lists them, and each tile shows how much is inside. Settings is laid out at the end of More.

## Releases

- Every release has five steps: Planning → Design → Handoff → Development → Farewell. `docs/release-workflow.md` has the full steps.
- Charli gates each step. Stop at the end of a step, and start the next step only when Charli asks.
- Design covers the UI and the DB of every milestone in the plan, unless a milestone does not need it. Charli can ask for revisions, and each revision follows the Impeccable rules.
- Each artifact name holds the version: `my-app v<version> plan`, `my-app v<version> design`, `my-app v<version> handoff`, `my-app v<version> release notes`.
- Link each artifact in `docs/releases/v<version>.md` and `docs/releases/index.md` as soon as you publish it.
- `CHANGELOG.md` has a short entry for each release. Add each change to `Unreleased` during Development.
- A GitHub release holds only the source code archives. Never attach the APK.
- Project skills and agents are in `.claude/`. `docs/conventions.md` lists them.

## Phases

1 Foundation (sign in with Google on Android and web) → 2 Todo + reminders → 3 Vehicle → 4 Inventory → 5 Money → 6 Vault → 7 Release. Each phase has a "done when" check in the handoff page; finish it before moving on.
