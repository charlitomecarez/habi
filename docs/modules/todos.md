# Todos

**Files:** `lib/todos.ts`, `app/(app)/(tabs)/todos.tsx`, `app/(app)/todo/new.tsx`, `app/(app)/todo/[id].tsx`, `components/todos/TodoForm.tsx`, `components/todos/TodoRow.tsx`, migrations `...0200_todos.sql` and `...0800_reminder_delivery.sql`.

## Data

`todos` row: `title` (1–300 characters), `notes`, `priority` (1 high, 2 normal, 3 low), `due_at`, `remind_at`, `repeat`, `completed_at`.

`useTodos()` loads open todos plus todos finished in the last 30 days.

## Grouping (`groupTodos`)

A todo's date is `due_at`, else `remind_at` (`todoDate`).

| Group           | Contains                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `today`         | Open todos with no date, an overdue date or a date today. Also todos finished today, listed last. |
| `upcoming`      | Open todos with a date after today.                                                               |
| `nextSevenDays` | The part of `upcoming` in the next 7 days.                                                        |
| `done`          | Finished todos, newest first.                                                                     |

`isOverdue` is true when the todo is open and its date is before the start of today.

The Todos tab has a segmented filter: Today, Upcoming, Done. The subtitle reads "N due today". Home shows the open todos in `today` as "Needs attention" cards.

## Form rules (`TodoForm`)

- The title is required.
- A repeating todo needs a due date or a reminder.
- The fields are title, notes, due, remind, repeat and priority.

## Behaviour in the database

- **Reminder sync:** `todos_sync_reminder` keeps one pending reminder per open todo that has `remind_at`. A change to the title, notes or `remind_at` updates it. Completing the todo, clearing `remind_at` or deleting the todo removes it.
- **Repeat:** when a todo with `repeat <> 'none'` is completed, `todos_repeat_on_complete` inserts the next todo:
  - It steps from the original date by 1 day, 7 days or 1 month in the user's time zone, so "monthly" keeps the day of the month.
  - It skips to the first date after now.
  - It sets `repeat = 'none'` on the finished row, so unchecking and checking again adds no copy.

## Toggle

`useToggleTodo` changes `completed_at` in the cache at once (optimistic update). On an error it puts the old list back. Then it reloads, because a repeat adds a new row on the server.
