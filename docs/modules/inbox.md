# Voice Inbox

**Files:** `lib/voice.ts`, `lib/voice-audio.ts`, `app/(app)/inbox/`, `components/inbox/`, `components/home/InboxCard.tsx`, `supabase/functions/voice-transcribe/`, `supabase/functions/voice-cleanup/`, migration `...20261105000700_voice_inbox`.

One person records in the app, and the other reads plain text. It works in both directions. Only voice messages connect two accounts. All other data stays separate.

## Who has voice

- Sign-up is off, so the admin adds each account. Voice is off until the admin ticks the account on the Voice access screen (`app/(app)/inbox/access.tsx`, reached from Inbox).
- `app_admins` marks the admin. Add that row in the SQL editor, so no address goes in the repo. Only the admin sees the Voice access button.
- A ticked account and the admin can message each other. Ticked accounts cannot message each other. `voice_can_message` holds this rule, and `voice-transcribe` checks it on every send and retry.
- `app_admins` and `voice_access` can only be read by the app. Ticks go through `set_voice_access`, which refuses anyone but the admin.
- Unticking stops new messages at once. Past text stays.
- With more than one contact, Record makes you choose, so a message cannot go to the wrong person.

## A message

1. Record starts at once and stops at 5 minutes. The file is mono AAC at 64 kbps, about 2.4 MB at most.
2. The app uploads to the private `voice-audio` bucket at `<sender_id>/<id>.m4a`. Only an account with voice can upload.
3. The app calls `voice-transcribe`, which keeps `verify_jwt` on. It checks the sign-in, the recipient, the path, the length and the limit of 50 messages in 24 hours, then adds a `pending` row.
4. The function sends the audio to Groq (`whisper-large-v3`, or `GROQ_SPEECH_MODEL`), saves the text and sets `ready`. A failure sets `failed` and keeps the audio, and Sent shows Retry. A `pending` row older than 5 minutes can also retry.
5. A trigger writes a `reminders` row for the receiver. `voice-transcribe` then wakes `send-reminders`, which sends the push at once. If that call fails, the 15-minute run sends it. Tapping the push opens Inbox.
6. The receiver reads the text in Inbox. Opening the screen calls `mark_voice_inbox_read`.

Sending the same file again returns the first result, so a lost reply cannot send twice.

## Rules

- Only `voice-transcribe` writes `voice_messages`. The app has no insert, update or delete policy, so it cannot set a transcript, a status or a recipient.
- The receiver sees a row only when it is `ready`. The sender sees all their rows.
- The push says only "New voice message". The text stays out of Expo Push, the lock screen and the digest.
- Log only the status and the length. Never log the audio or the text. Groq error bodies stay out of the logs too.
- `GROQ_API_KEY` lives only in Edge Function secrets. It never gets the `EXPO_PUBLIC_` prefix.

## Audio cleanup

`voice-cleanup` runs at 1:00 AM PHT from `pg_cron`. It deletes audio older than 7 days through the Storage API, sets `audio_path` to null and keeps the text. A message with no audio cannot retry.

## Limits

- Taglish accuracy has not been measured with real clips.
- An upload with no matching row, from a send that never finished, stays in the bucket.
