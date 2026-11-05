# Content planner

**Files:** `lib/content/index.ts`, `lib/content/stages.ts`, `app/(app)/content/`, `components/content/`, migrations `...000200_content_videos` and `...000300_todos_video_id`.

- `content_videos` holds one row per video, from idea to published. The format is `long` or `short`.
- Stages are `idea`, `script`, `record`, `edit`, `polish`, `publish` and `published`.
- `lib/content/stages.ts` holds the steps for each stage and all stage logic. It has tests. `done_steps` stores the ticked steps.
- `useSaveVideo` updates the list before the server answers.
- `posts` stores where and when a video went live.

## Tasks

A video's tasks are todos with `video_id`. They also show in Todos and use its reminders. A trigger checks that the video belongs to the same user.

## Reminders

Source `content`. One push at 9:00 local time on `publish_on`, while the video is not published.
