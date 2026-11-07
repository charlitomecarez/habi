# Journal

**Files:** `lib/journal.ts`, `app/(app)/journal/`, migration `...001000_journal`.

- `journal_entries` holds one short entry per day (unique on `user_id`, `on_date`), with a mood and an optional photo.
- A second save on the same day edits that entry.
- Moods are `great`, `good`, `okay`, `low` and `bad`.
- The text is plain text protected by RLS. It is not in the Vault.
- The photo goes in the private `user-files` bucket under `<user_id>/journal/`, through `lib/photos.ts`.
- `useJournal` loads every entry, newest first. One entry a day stays small.
- The module sends no reminders.
- `journal/entry/[date]` reads an entry: the photo, the full text, and links to the older and newer entries. It has no primary action. The pencil opens the form in `journal/[date]`.
- A tap on a day with an entry opens it to read. A tap on a day with no entry opens the form.
