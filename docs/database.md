# Database

The schema is in `supabase/migrations/`. The migrations run in file-name order. Never edit an applied migration. Add a new file.

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

| Table           | Purpose                                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_settings` | One row per user: `timezone` (default `Asia/Manila`), `digest_enabled`, `digest_hour` (default 7), `digest_last_sent_on`. A trigger on `auth.users` creates the row. |
| `push_tokens`   | Expo push tokens per device. `token` is unique.                                                                                                                      |
| `reminders`     | The single notification queue. See [reminders.md](reminders.md).                                                                                                     |

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

| Table              | Purpose                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `money_accounts`   | `name`, `kind`, `opening_balance`, `currency`, `is_archived`, `sort_order`.                                                                                       |
| `money_categories` | `name`, `kind` (`expense` or `income`), `icon`, `sort_order`.                                                                                                     |
| `exchange_rates`   | One rate to PHP per foreign currency, set by the user.                                                                                                            |
| `subscriptions`    | `amount`, `currency`, `billing_cycle`, `next_billing_on`, `remind_days_before`, `account_id`, `category_id`.                                                      |
| `transactions`     | `kind`, `amount` (always positive), `account_id`, `to_account_id`, `category_id`, `subscription_id`, `occurred_on`, `merchant`, `note`, `source`, `external_ref`. |

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

The odometer never goes down. Both log triggers use `greatest(current, new)`.

## RPC

`seed_money_defaults()` adds four accounts (Cash on hand, GCash, MariBank, GoTyme) and 13 categories when the user has none. The app calls it after each sign-in. A second call does nothing.

## Storage

One private bucket: `user-files`. The limit is 5 MB per file. It accepts JPEG, PNG and WebP.

- The path is `<user_id>/<folder>/<name>-<timestamp>.jpg`. The folders are `inventory` and `receipts`.
- Policies allow access only inside the user's own `<user_id>/` folder.
- The app reads photos with signed URLs that last one hour.

A second private bucket, `voice-audio`, holds voice messages. See [modules/inbox.md](modules/inbox.md).

## Types

`types/database.ts` is generated. Generate it again after every migration:

```sh
supabase gen types typescript --linked > types/database.ts
```

`lib/*.ts` uses `Tables<"name">` and `Enums<"name">` from this file.
