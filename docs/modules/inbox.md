# Voice Inbox

**Files:** `lib/voice.ts`, `lib/voice-audio.ts`, `app/(app)/inbox/`, `components/inbox/`, `components/home/InboxCard.tsx`, `supabase/functions/voice-transcribe/`, `supabase/functions/voice-cleanup/`, migration `...20261105000700_voice_inbox`.

One partner records in the app, and the other reads plain text. It works in both directions. Only voice messages connect the two accounts. All other data stays separate.

## Pairing

- On the Inbox screen, one account makes a code and the other types it. The code works once, for 15 minutes.
- `voice_pairs` has one row for each direction. The app can only read it. All writes go through `create_voice_pair_code`, `redeem_voice_pair_code` and `unpair_voice`, so an account cannot pair itself to anyone.
- Unpairing stops new messages. Past text stays.

## A message

1. Record starts at once and stops at 5 minutes. The file is mono AAC at 64 kbps, about 2.4 MB at most.
2. The app uploads to the private `voice-audio` bucket at `<sender_id>/<id>.m4a`. Only a paired sender can upload.
3. The app calls `voice-transcribe`, which keeps `verify_jwt` on. It checks the sign-in, the pairing, the path, the length and the limit of 50 messages in 24 hours, then adds a `pending` row.
4. The function sends the audio to Groq (`whisper-large-v3`, or `GROQ_SPEECH_MODEL`), saves the text and sets `ready`. A failure sets `failed` and keeps the audio, and Sent shows Retry. A `pending` row older than 5 minutes can also retry.
5. A trigger writes a `reminders` row for the receiver. `send-reminders` sends the push within 15 minutes.
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
- A push can arrive up to 15 minutes late.
- An upload with no matching row, from a send that never finished, stays in the bucket.
