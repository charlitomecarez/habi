# Travel planner

**Files:** `lib/travel.ts`, `lib/trip-pdf.ts` (+ `.web.ts`), `app/(app)/travel/`, `components/travel/`, migration `...20261105000500_travel`.

You type the plans, and the app organises them. It needs no outside service.

## Trips and items

- `trips` holds the title, dates and an optional budget.
- `trip_items` holds what you will do. Kinds are `go`, `stay`, `eat`, `transport` and `other`.
- An item with a `day` shows on that day. An item with no `day` waits in Ideas.
- `groupByDay` sorts by time, with untimed items last. An item outside the trip dates still shows, so changing the dates cannot hide it.
- A trigger checks that the trip and the linked document belong to the same user.

## Budget and Money

- `tripTotals` adds the planned costs with the existing exchange rates, and names any currency with no rate.
- "Mark as paid" calls `mark_trip_item_paid`, which adds one expense, the same as `buy_gift`. It changes no account balance, and it refuses a second payment.

## Reminders

Source `trip_item`. One push one hour before an item with a day and a time. A past or done item gets none.

## Maps

`mapLink` uses your link, or builds a Google Maps search from the place. It needs no map SDK and no key, and it ignores a link that is not `http` or `https`.

## PDF export

- `tripHtml` is pure, with tests, and escapes all text you typed.
- The PDF shows the title, the dates, each day in order and map links.
- Booking references, notes and ideas never go in it, because friends can forward a PDF. Costs go in only with the switch on.
- Android uses `expo-print` and `expo-sharing`. Web opens the browser print window.
- The PDF is a copy from that moment. When the plan changes, export it again.
