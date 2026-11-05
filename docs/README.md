# my-app docs

These docs explain how my-app is built and how it behaves. Read this page first. Then open only the page for the area you change.

## Pages

| Page                                         | Read it when you change                                        |
| -------------------------------------------- | -------------------------------------------------------------- |
| [architecture.md](architecture.md)           | Routing, providers, auth, data fetching, adapters, theming     |
| [database.md](database.md)                   | Tables, RLS, triggers, views, storage                          |
| [reminders.md](reminders.md)                 | Push notifications, the reminder queue, the daily email digest |
| [design-system.md](design-system.md)         | Tokens, shared UI components, layout rules                     |
| [conventions.md](conventions.md)             | Project rules, commands, known problems                        |
| [modules/todos.md](modules/todos.md)         | Todos, repeats, todo reminders                                 |
| [modules/vehicle.md](modules/vehicle.md)     | Odometer, service schedule, service log                        |
| [modules/inventory.md](modules/inventory.md) | Items, nested locations, photos, QR labels                     |
| [modules/money.md](modules/money.md)         | Accounts, transactions, subscriptions, exchange rates          |
| [modules/vault.md](modules/vault.md)         | Master password, encryption, fingerprint unlock                |
| [modules/habits.md](modules/habits.md)       | Habit schedules, streaks, habit reminders                      |
| [modules/gym.md](modules/gym.md)             | Workout plans, sessions, sets                                  |
| [modules/journal.md](modules/journal.md)     | Daily entries, moods, photos                                   |
| [modules/health.md](modules/health.md)       | Medicines, doses, visits, weight                               |
| [modules/people.md](modules/people.md)       | Yearly dates, gift ideas, the debts link                       |
| [modules/debts.md](modules/debts.md)         | Debts, payments, balances                                      |
| [modules/shopping.md](modules/shopping.md)   | The shopping list, checkout, past items                        |
| [modules/documents.md](modules/documents.md) | Documents, expiry dates, encrypted photos                      |
| [modules/content.md](modules/content.md)     | Videos, stages, video tasks                                    |

## Facts to know first

- my-app has one user (Charli, Asia/Manila). Android is the first target. Web is the second. Both use one codebase.
- Expo SDK 58, expo-router, NativeWind 4, TypeScript.
- Supabase holds all data. Every user-owned table has row-level security (RLS) on `user_id`.
- The database does most of the business logic with triggers and views. The app reads and writes rows with `@supabase/supabase-js`.
- Server state lives in @tanstack/react-query. Client-only state lives in zustand (only the vault key).
- Only the `send-reminders` Edge Function sends notifications. Modules write rows to `public.reminders`.
- The vault encrypts on the device. Supabase never gets the plaintext or the key.

## Where the code is

```
app/                    expo-router screens
  (auth)/login.tsx      the only public screen
  (app)/(tabs)/         Home, Money, Todos, Vehicle, More
  (app)/<module>/       pushed screens and modal forms
components/ui/          shared UI components
components/<module>/    forms and parts for one module
lib/                    data hooks and helpers, one file per module
providers/              AuthProvider, QueryProvider
supabase/migrations/    the schema and all database logic
supabase/functions/     Edge Functions: send-reminders, daily-tip, import-statement
types/database.ts       generated Supabase types
tailwind.config.js      design tokens
global.css              light and dark colour values
```

Keep these docs current. When you change a behaviour that a page describes, update that page in the same change.
