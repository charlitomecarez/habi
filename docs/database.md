# Database

The schema is in `supabase/migrations/`. The migrations run in file-name order. Never edit an applied migration. Add a new file.

## Project

The live project is in Singapore (`ap-southeast-1`) from v1.5.0, close to the users in the Philippines. Supabase cannot move a project, so v1.5.0 made a new project and copied everything into it:

1. `npx supabase db push --remote` ran every migration, so the migration history is the same.
2. The cron jobs stayed off until the copy was done.
3. A data-only dump of `auth.users`, `auth.identities` and `public` was restored with `session_replication_role = replica`, so no trigger added rows twice. The user IDs did not change, so every `user_id` and storage path still matches.
4. Each file in `user-files` and `voice-audio` was copied with the same path and owner.
5. Every Edge Function was deployed, and `project_url` and `reminders_cron_secret` were set in the vault. The owner set the other Edge Function secrets, the Auth providers, the redirect URLs, SMTP and the email templates in the dashboard.

The row counts, the file counts and sizes, the security advisors and the generated types matched the old project before the switch. An APK points to one project, so the new project needs a new APK.

The Supabase CLI needs Docker for `db dump`. On a Mac without Docker, `db dump --dry-run` prints the `pg_dump` script with a short-lived login role, and a local `pg_dump` and `psql` run it. Run `set role postgres` first.

## Security model

- Every user-owned table has `user_id uuid not null default auth.uid()`.
- `public.apply_owner_rls(table)` turns on RLS and adds select, insert, update and delete policies for `user_id = auth.uid()`. Every user-owned table calls it once.
- The app never sends `user_id`. The column default fills it.
- RLS checks only the row's own `user_id`. Owner triggers also check that a referenced row belongs to the same user:
  - `check_vehicle_owner()` on `vehicle_services`, `odometer_logs`, `service_logs`.
  - `check_location_owner()` on `inventory_items` and `inventory_locations`.
  - `check_money_refs()` on `transactions` and `subscriptions`.
- Views use `security_invoker = true`, so they apply the caller's RLS.
- Trigger functions that write to `reminders` or other tables use `security definer`. They write rows only for the `user_id` of the row that fired them.
- `vehicle_models` and `service_templates` are shared reference data. Everyone can read them. Only migrations change them.

## Tables

### Core (`20261103000100_core.sql`, `20261103000800_reminder_delivery.sql`)

| Table           | Purpose                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_settings` | One row per user: `timezone` (default `Asia/Manila`), `digest_enabled`, `digest_hour` (default 7), `digest_last_sent_on`, `home_shortcuts`, the ulam limit and avoid list, `followed_teams` (`league:team`, at most 12), `hidden_modules` (module ids switched off in Settings › Modules) and `health_check` (the 6 PM health check, default off). A trigger on `auth.users` creates the row. |
| `push_tokens`   | Expo push tokens per device. `token` is unique.                                                                                                                                                                                                                                                                                                                                               |
| `reminders`     | The single notification queue. See [reminders.md](reminders.md).                                                                                                                                                                                                                                                                                                                              |

### Todos (`20261103000200_todos.sql`)

`todos`: `title`, `notes`, `priority` (1 high, 2 normal, 3 low), `due_at`, `remind_at`, `repeat` (`none`, `daily`, `weekly`, `monthly`), `completed_at`.

### Vehicle (`20261103000300_vehicles.sql`, seed `...0310`, intervals `...0900`)

| Table               | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `vehicle_models`    | Shared. Honda ADV 160 is the one default (`is_default`).               |
| `service_templates` | Shared. The service items and intervals for a model.                   |
| `vehicles`          | Per user. `current_odometer_km`, `is_primary` (at most one per user).  |
| `vehicle_services`  | Per vehicle copy of the schedule, so intervals can change per vehicle. |
| `odometer_logs`     | Each odometer reading.                                                 |
| `service_logs`      | Each service done. `receipt_path` points into storage.                 |

View `vehicle_service_due`: one row per active vehicle service with `next_due_km`, `next_due_on`, `km_remaining`, `days_remaining` and `status`. See [modules/vehicle.md](modules/vehicle.md).

### Inventory (`20261103000400_inventory.sql`)

| Table                 | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `inventory_locations` | Nested places with `parent_id` (room › shelf › box). `qr_code` is unused. |
| `inventory_items`     | `name`, `category`, `quantity`, `notes`, `photo_path`, `location_id`.     |

Deleting a location sets `parent_id` and `location_id` to null on the children. It does not delete them.

### Vault (`20261103000500_vault.sql`)

| Table            | Purpose                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `vault_settings` | One row per user: KDF name, salt, ops and memory limits, and the key check. |
| `vault_entries`  | `ciphertext`, `nonce` and `version` only. No plaintext columns.             |

### Money (`20261103000700_money.sql`)

| Table                                               | Purpose                                                                                                                                                                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `money_accounts`                                    | `name`, `kind`, `opening_balance`, `currency`, `is_archived`, `sort_order`.                                                                                                                                                         |
| `money_categories`                                  | `name`, `kind` (`expense` or `income`), `icon`, `sort_order`.                                                                                                                                                                       |
| `exchange_rates`                                    | One rate to PHP per foreign currency, set by the user.                                                                                                                                                                              |
| `subscriptions`                                     | `amount`, `currency`, `billing_cycle`, `next_billing_on`, `remind_days_before`, `account_id`, `category_id`.                                                                                                                        |
| `recurring_transactions`                            | A rule that saves its own row. `schedule`, `week_days`, `month_day`, `is_paused`, `last_run_on`. `add_due_recurring` runs each hour.                                                                                                |
| `feedback`                                          | Report a bug. A sent report cannot change. `select_own_or_admin` lets each account read its own reports and `app_admins` read every row; `admin_update` lets `app_admins` change one. 20 reports a day for each account.            |
| `sports_matches`, `sports_standings`, `sports_sync` | Shared. RLS allows signed-in reads, and only the service role in `sports-sync` writes.                                                                                                                                              |
| `motor_races`, `motor_results`, `motor_standings`   | F1 and MotoGP (`20261111000200_motorsport.sql`). Shared, like Sports. RLS allows signed-in reads, and only `sports-sync` writes. `sports_sync` also holds `F1` and `MGP`. `user_settings.followed_series` lists the series on Home. |
| `movies`, `movies_sync`                             | Movies (`20261111000300_movies.sql`). Shared. RLS allows signed-in reads. Only `movies-sync` writes, through `replace_movies()`, which only the service role can run.                                                               |
| `news_items`, `news_sync`                           | Shared, like Sports. RLS allows signed-in reads, and only the service role in `news-sync` writes. No `user_id`, because a headline is not personal.                                                                                 |
| `job_profiles`, `job_matches`                       | Find a work. No name, phone or address column. Only `job-search` adds matches, so `owner_insert` is dropped on `job_matches`. `score` and `reason` are null for a job that Groq could not rank.                                     |
| `transactions`                                      | `kind`, `amount` (always positive), `account_id`, `to_account_id`, `category_id`, `subscription_id`, `occurred_on`, `merchant`, `note`, `source`, `external_ref`.                                                                   |

Views:

- `money_account_balances`: the opening balance only. Transactions do not change it.
- `subscription_costs`: each subscription plus `rate_to_php` and `monthly_php`. `monthly_php` is null when a foreign currency has no rate.

## Triggers

| Trigger                             | Table           | What it does                                                          |
| ----------------------------------- | --------------- | --------------------------------------------------------------------- |
| `*_updated_at`                      | several         | Sets `updated_at` on update.                                          |
| `on_auth_user_created_settings`     | `auth.users`    | Creates the `user_settings` row.                                      |
| `todos_sync_reminder`               | `todos`         | Keeps one pending reminder per open todo with a `remind_at`.          |
| `todos_repeat_on_complete`          | `todos`         | Completing a repeating todo inserts the next one.                     |
| `vehicles_defaults`                 | `vehicles`      | Fills make and model from the default model.                          |
| `vehicles_copy_templates`           | `vehicles`      | Copies the model's service templates into `vehicle_services`.         |
| `odometer_logs_after_insert`        | `odometer_logs` | Raises the vehicle odometer. Queues reminders for overdue services.   |
| `service_logs_after_insert`         | `service_logs`  | Clears the pending reminder for that service. Raises the odometer.    |
| `subscriptions_sync_reminder`       | `subscriptions` | Keeps one pending renewal reminder per active subscription.           |
| `transactions_advance_subscription` | `transactions`  | A payment linked to a subscription moves `next_billing_on` one cycle. |

The odometer goes down only through an `odometer_logs` row with `is_correction`. Every other log uses `greatest(current, new)`, so an old fuel or service entry never lowers it. A correction also deletes pending `vehicle_service` reminders that are no longer overdue.

### Health check (`20261110000200_health_check.sql`)

| Table             | Notes                                                                                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `health_days`     | One row a day per account: `sleep_minutes` (0 to 1440), `bed_time`, `wake_time`, `sleep_source` (`health_connect`, `screen` or `typed`) and `steps` (0 to 200,000). Unique `(user_id, day)`. Owner RLS; the app upserts its own rows only while the check is on. |
| `health_insights` | 1 to 3 `tips` a day (no empty tip, 600 characters in all) and `based_on`. Unique `(user_id, day)`. The owner can read and delete; only the `health-insight` function writes.                                                                                     |

`weight_logs.source` (`20261111000100_weight_source.sql`) is `typed` (the default) or `health_connect`. `save_health_weights(p_weights jsonb)` (security invoker) saves one Health Connect weight a day, and updates only a row that Health Connect wrote, so a typed weight wins. It returns the count of changed rows.

`clear_health_check()` (security invoker) deletes the caller's rows in both tables and sets `health_check = false`. The `health-insight` cron job runs at :45 each hour. `docs/modules/health.md` has the flow.

## Indexes

Every foreign key has an index (migration `20261110000100`), so a delete of a parent row and a join on the key stay fast. A new foreign key gets its own index in the same migration. The performance advisors must show no unindexed foreign key.

## RPC

`home_summary(...)` returns every read on Home in one `jsonb`: a key for each module's rows (`todos`, `vehicle`, `services_due`, `subscriptions`, `medicines`, `doses`, `visits`, `weights`, `debts`, `debt_balances`, `people`, `person_dates`, `gift_ideas`, `month_transactions`, `settings`, `budgets`, `budget_spending`, `habits`, `habit_checks`, `ulam_days`, `admin`, `has_voice_access`, `voice_contacts`, `inbox`, `tip`, `news`, `game_leagues`, `games`). Each key holds the same columns and order as the module's own query. From `20261111000100`, `weights` also holds `source`. The phone sends its own dates (today, the month, the dose and history windows), because they are local to the phone. It is `security invoker`, so RLS of the caller applies, and only `authenticated` can call it. `lib/home-summary.ts` explains how the app uses it.

`seed_money_defaults()` adds four accounts (Cash on hand, GCash, MariBank, GoTyme) and 13 categories when the user has none. The app calls it after each sign-in. A second call does nothing.

## Storage

One private bucket: `user-files`. The limit is 5 MB per file. It accepts JPEG, PNG and WebP.

- The path is `<user_id>/<folder>/<name>-<timestamp>.webp` from v1.5.0, and `.jpg` before it. The folders are `inventory`, `receipts` and `journal`, and `documents` and `health` hold encrypted `.bin` files.
- An inventory photo has a list copy beside it, `<name>-<timestamp>.320.webp`, for the list thumbnail.
- Policies allow access only inside the user's own `<user_id>/` folder.
- The app reads photos with signed URLs that last one hour.

A second private bucket, `voice-audio`, holds voice messages. See [modules/inbox.md](modules/inbox.md).

## Types

`types/database.ts` is generated. Generate it again after every migration:

```sh
supabase gen types typescript --linked > types/database.ts
```

`lib/*.ts` uses `Tables<"name">` and `Enums<"name">` from this file.
