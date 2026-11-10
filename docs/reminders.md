# Reminders and the daily digest

## The rule

Only the `send-reminders` Edge Function sends notifications. A module never calls a push or email API. A module (or its trigger) writes a row to `public.reminders`.

## The reminder queue

`public.reminders` columns: `source_type`, `source_id`, `title`, `body`, `remind_at`, `sent_at`.

- `source_type` is the module that wrote the row, such as `todo`, `vehicle_service` or `subscription`. Each module doc lists its own.
- A partial unique index allows only one pending (`sent_at is null`) row per `(source_type, source_id)`. Triggers upsert on this index.
- A sent row stays in the table as history.

Who writes reminders:

| Source            | Trigger                       | When                                                                                                                       |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `todo`            | `todos_sync_reminder`         | A todo has `remind_at` and is open. Clearing `remind_at`, completing or deleting removes the pending row.                  |
| `vehicle_service` | `odometer_logs_after_insert`  | A new reading makes a service overdue. `remind_at` is now.                                                                 |
| `vehicle_service` | `service_logs_after_insert`   | Removes the pending row for the service that was done.                                                                     |
| `subscription`    | `subscriptions_sync_reminder` | 09:00 local time, `remind_days_before` days before `next_billing_on`. An inactive or deleted subscription removes the row. |

## Push registration

`lib/push-notifications.ts` runs once when the signed-in app opens (`app/(app)/_layout.tsx`):

1. It returns at once on an emulator or on web (the web file is a no-op).
2. It creates the Android channel `reminders` with high importance.
3. It asks for notification permission.
4. It gets the Expo push token with the EAS project ID from `app.json`.
5. It upserts the token into `push_tokens`.

## The Edge Function

`supabase/functions/send-reminders/index.ts`. pg_cron calls it every 15 minutes with pg_net (migration `20261103000800`).

- The request must have the header `x-cron-secret` equal to the `CRON_SECRET` secret. Otherwise it returns 401.
- It uses the service-role key, which the platform gives it.

### Step 1: due reminders

1. It reads up to 500 rows with `sent_at is null` and `remind_at <= now()`.
2. It reads the push tokens for those users.
3. It sends to the Expo Push API in batches of 100, on channel `reminders`.
4. If Expo returns an HTTP error, it throws. All rows stay unsent, so the next run tries again.
5. It deletes tokens that return `DeviceNotRegistered`.
6. It sets `sent_at` on every row it read, also for users with no device. Those users get the digest.

### Step 2: daily digest

For each `user_settings` row with `digest_enabled`:

1. It finds the local date and hour in the user's `timezone`.
2. It skips the user when the hour is before `digest_hour`, or when `digest_last_sent_on` is today.
3. It loads:
   - open todos that are due today or before, or that have a reminder today;
   - overdue vehicle services;
   - active subscriptions that renew in the next 7 days.
4. `digest.ts` (`buildDigest`) builds the subject, HTML and text. It returns null when there is nothing.
5. It sends the email with Resend from a noreply address (`DIGEST_FROM` in `send-reminders`).
6. It sets `digest_last_sent_on` to today, also when the day was empty.

If `RESEND_API_KEY` is not set, step 2 does nothing.

## Secrets and one-time setup

- Function secrets: `CRON_SECRET`, `RESEND_API_KEY`.
- Supabase Vault secrets (SQL editor, once per database): `project_url` and `reminders_cron_secret`. The cron job reads them, so no secret is in git.

The README has the commands.

## Reminder taps

`send-reminders` adds `sourceId` to the push data. `lib/reminder-route.ts` maps a source to a route, and `onPushOpened` opens it. A push with no ID opens the list. Deploy the function before you install the APK.
