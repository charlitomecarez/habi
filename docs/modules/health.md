# Health

**Files:** `lib/health.ts`, `lib/secure-photos.ts`, `app/(app)/health/`, `components/health/`, migration `...001100_health`.

## Medicines

- `medicines` holds the times of day, a start date and an optional end date. `isActive` is true until the end date has passed.
- `medicine_doses` holds one row per scheduled dose, for today and the next two days. The hourly `fill-medicine-doses` job keeps it filled.
- Changing a medicine drops its future pending doses and writes them again.
- `useMarkDose` sets a dose to Taken or Skipped, or back to pending.

## Visits

- `health_visits` holds the date, doctor, reason and notes.
- `photo_paths` points to lab photos encrypted on the phone with the Vault key. Supabase stores only ciphertext, and the photos need an unlocked vault.

## Weight

`weight_logs` holds one row per day. A second log on the same day replaces it.

## Reminders

Source `medicine`. Each pending dose has its own push. Taken, Skipped or deleting removes it. The daily digest lists today's doses.
