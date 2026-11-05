# People and dates

**Files:** `lib/people.ts`, `app/(app)/people/`, migration `...000500_people`.

## Dates

- `person_dates` holds a month and a day, with an optional year for "turns 30". Kinds are `birthday`, `anniversary` and `other`.
- `nextOccurrence` finds the next yearly date. Feb 29 falls on Feb 28 in other years. The database function `next_person_date` follows the same rule.

## Gifts

- `gift_ideas` holds a title and an optional price.
- `useBuyGift` calls `buy_gift`, which marks the gift bought and adds one Money expense. It does not change an account balance.

## Debts link

`debts.person_id` links a debt to a person. Typing a new name on a debt adds that person, and the same name in any case finds them.

## Reminders

Source `person_date`. One push at 9:00 local time, one week before the next occurrence. When it is sent, a trigger writes next year's. Renaming a person rewrites the titles.
