# Documents

**Files:** `lib/documents.ts`, `lib/secure-photos.ts`, `app/(app)/documents/`, `components/documents/`, migration `...000600_documents`.

- `documents` holds one row per document: type, name, number, issued and expiry dates, and an optional linked vehicle.
- Types are `lto_registration`, `drivers_license`, `passport`, `insurance`, `philhealth` and `other`.
- `documentStatus` always gives a word: Expired, Due soon, Valid or No expiry. Due soon means within 30 days.
- `useDocuments` sorts by the soonest expiry, with no-expiry documents last.

## Photos

`photo_paths` points to files encrypted on the phone with the Vault key. Supabase stores only ciphertext, and the photos need an unlocked vault.

## Reminders

Source `document`. One push at 9:00 local time, `remind_days_before` days before the expiry (30 by default). A new expiry date moves it.
