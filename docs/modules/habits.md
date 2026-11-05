# Habits

**Files:** `lib/habits.ts`, `app/(app)/habits/`, `components/habits/`, migration `...000700_habits`.

## Schedules

- A habit runs `daily`, on set `weekdays`, or a number of `times_per_week`. Weeks run Monday to Sunday.
- `habit_checks` holds one row per habit per day, in local dates (unique on `habit_id`, `on_date`).
- `isScheduled` is true every day for a "times a week" habit.

## Streaks

- `streak` counts scheduled days in a row for daily and set-day habits. A day off the schedule does not break it.
- Today counts only once it is ticked.
- A "times a week" habit counts weeks that reached the number. This week counts once it does.
- `useHabits` loads checks from the last 400 days, which covers streaks and the month grid.

## Ticks and archive

- `useToggleCheck` updates the screen before the server answers.
- Archiving keeps the history and stops reminders. Deleting removes the habit and its checks.

## Reminders

Source `habit`. One push at `remind_time` on the next day the habit is due and not done. A "times a week" habit stops once the week's count is done. A trigger writes the next reminder after each send and each tick.
