# Gym

**Files:** `lib/gym.ts`, `app/(app)/gym/`, `components/gym/`, migration `...000800_gym`.

## The plan and what you did

- The plan: `workout_plans` (one per workout day, such as "Upper body", with its own weekdays) and `workout_exercises` (sets, reps, optional weight).
- What you did: `workout_sessions` (one per plan per day) and `workout_sets` (each ticked set, with the reps and weight you did).
- Ticking a set never changes the plan.

## Behaviour

- `useSavePlan` saves a plan and its exercises. An exercise left out of the list is deleted, and its history stays.
- `ensureSession` makes today's session on first use.
- `trainedOrMissed` lists gym days up to today, with whether you trained.
- `useExerciseHistory` shows every set for one exercise, newest first.
- Archiving a plan keeps the history and stops reminders.

## Reminders

Source `workout`. One push at `remind_time` on each gym day until you train. The daily digest does not read these tables, so there is no email.
