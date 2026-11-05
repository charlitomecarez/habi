# Alarms

**Files:** `modules/alarm/`, `lib/alarm.ts`, `lib/alarm.web.ts`, `lib/alarm-rules.ts`, `app/(app)/alarms/`, `app/alarm-ringing.tsx`, `components/alarms/`.

## Why it is on the phone

A push can arrive late and needs internet, so it cannot ring like an alarm. The phone schedules and plays the alarm by itself. Alarms save on the device (`AlarmStore`), so this module has no table and no migration.

## How a ring works

1. `AlarmScheduler` sets the next ring with `AlarmManager.setAlarmClock`.
2. `AlarmReceiver` fires. It records the ringing id, starts `AlarmService`, and sets the next ring. JavaScript is not needed, so a repeating alarm keeps its schedule even if the app never opens.
3. `AlarmService` is a foreground service. It starts the sound on the alarm volume and the vibration, before any screen loads. A bad sound file cannot stop the vibration.
4. The service's full-screen intent opens `myapp://alarm-ringing`. `AlarmActivityListener` shows the app over the lock screen only for that intent.
5. `stopRinging` stops the service and takes the app off the lock screen. Nothing else stops it.

## Stop task

1. Scan the stop label. Its text is fixed (`STOP_LABEL`), so a printed label works in every build.
2. Solve 3 easy sums (`makeSums`). A right answer moves on by itself.
3. If the camera fails, "Camera not working?" gives 8 sums instead. This backup can be done from bed. It is a known gap, kept so a camera problem never traps you.

## Awake check

- After the task, `scheduleAwakeCheck` sets a one-time alarm 3 minutes later, with the id `awake-check`.
- `AlarmService` opens the screen quietly for 60 seconds, and starts the sound only if nobody taps "I am awake".
- If the time runs out, the full stop task runs, and then another awake check follows.
- The test ring skips the awake check.

## Rules

- The ringing screen sits outside `app/(app)/`, because it must work with no session. It shows no personal data, and the back button does nothing.
- A full-screen intent takes over only a locked phone. `app/_layout.tsx` brings up the ringing screen when the app is open, or when you come back to it.
- `AlarmBootReceiver` sets the alarms again after a restart, an app update or a time change.
- On web, `lib/alarm.web.ts` reports that alarms work only in the Android app.

## Limits

- No app can ring when the phone is off, or after a force stop.
- After a restart, the alarms come back only once you unlock the phone one time.
- Android 14 and later can turn off the full-screen permission. The setup check reads the real state.
- Samsung can put apps to sleep. The setup check asks for Battery › Unrestricted.
- Keep your Clock alarm on as a backup until five real mornings pass.
