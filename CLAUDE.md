# my-app

Personal all-in-one app for one user (Charli, Philippines, Asia/Manila): todos with reminders, vehicle maintenance (Honda ADV 160 default), room inventory, money and subscriptions, password vault.

- Display name: my-app
- Android package: `com.charli.myapp` (app.json `android.package`; Google OAuth Android client IDs and FCM use it)
- URL scheme: `myapp`

## Stack

- Expo (expo-router, dev client) + TypeScript; Android first, web second, one codebase.
- Supabase: Postgres with RLS, Auth, Storage, Edge Functions, pg_cron + pg_net.
- Resend for email (Supabase SMTP sender + one daily digest). Expo Push for notifications.
- NativeWind for styling; Plus Jakarta Sans via @expo-google-fonts.
- Data: @supabase/supabase-js, @tanstack/react-query, zustand, react-hook-form + zod, date-fns.
- Everything must stay on free tiers.

## Environment

- `.env` (gitignored): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. These three are safe in the app bundle; nothing else is.
- Never put the Google client secret, Resend API key or Supabase service-role key in the app or the repo. They live only in the Supabase dashboard / Edge Function secrets.
- Email sender (Supabase SMTP via Resend): noreply@email.blabbun.com.

## Commands

- `npx expo run:android` for development builds (not Expo Go).
- `npx expo start --web` for web.
- `npx supabase db push` for migrations. Do not use Docker or a local Supabase server.
- `npm run db:types` after every migration. It reads the linked live project, so it needs no Docker.

## Rules

- Never write a migration without RLS: every user-owned table gets `user_id uuid not null default auth.uid()` and `select public.apply_owner_rls('public.<table>')`.
- Schema changes are new files in `supabase/migrations/`; never edit an applied migration.
- Only the reminder Edge Function sends notifications. Modules write rows to `reminders`.
- Vault data is encrypted on the device (libsodium Argon2id + XChaCha20-Poly1305). Never send plaintext or the key to Supabase, never log them.
- Android-only APIs live behind adapters: `name.ts` + `name.web.ts`. Screens never branch on `Platform.OS`.
- Statement import is a future feature; don't build it unless asked.

## Design system

- Use token classes only (see `tailwind.config.js`). No hex codes or bare px values in screens.
- Build screens from shared components in `components/ui/`: Button, Input, AmountInput, Select, Segmented, Chip, Card, ListGroup, ListRow, Badge, Notice, Fab, TabBar, ScreenHeader, Sheet.
- One primary action per screen. Accent (#0F766E) is never decoration.
- Minimum touch target 44px; icon-only buttons need an accessibility label.
- Status always includes a word (Overdue, Today, Due soon), not colour alone.
- Sentence case; buttons name the action ("Save expense"). Optional fields say "(optional)".
- Borders, not shadows (only the FAB has a shadow). Inputs use 16px text.
- Full-screen form for more than three fields; bottom sheet for one or two.

## Navigation

- `app/(auth)/login.tsx` is the only public screen; `app/(app)/` is protected (Stack.Protected + onAuthStateChange).
- Tabs: Home · Money · Todos · Vehicle · More. More holds the other modules in sections (Daily life: Habits, Gym, Journal, Health · People: People and dates, Debts · Home: Inventory, Shopping list · Records: Documents, Vault · Work: Content planner) and settings.

## Phases

1 Foundation (sign in with Google on Android and web) → 2 Todo + reminders → 3 Vehicle → 4 Inventory → 5 Money → 6 Vault → 7 Release. Each phase has a "done when" check in the handoff page; finish it before moving on.
