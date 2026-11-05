# Ulam

**Files:** `lib/ulam.ts`, `lib/ulam-backup.ts`, `app/(app)/ulam/`, `components/ulam/`, `supabase/functions/daily-ulam/`, `supabase/functions/_shared/ulam.ts`, `supabase/functions/_shared/ulam-prices.ts`, migration `...20261105000400_ulam`.

One realistic ulam a day, for one person, with no calendar and no meal plan. Only the last 7 days are kept.

## One Groq call a day

- `pg_cron` runs `daily-ulam` at 12:05 AM PHT. It asks Groq for 3 ulam for the admin and each ticked account (`app_admins`, `voice_access`), and stores one row in `ulam_days`. Other accounts see the bundled backup, so open sign-ups cannot use up the Groq free plan.
- The app reads only that row and never calls Groq, so a refresh makes no call. "Show another" moves to the next of the 3.
- `GROQ_API_KEY` lives only in Edge Function secrets. `GROQ_MODEL` is optional, and the default is `openai/gpt-oss-120b`.
- The prompt holds the price limit, the last 7 names, the price list and the food you never eat. It holds no name, no email and no money data.

## Checks before saving

`parseUlamReply` rejects bad JSON, the wrong number of ulam, an unknown ingredient, a cost over your limit, a repeat from the last 7 days, food you never eat, a wrong number of steps, and a cook time or calorie value out of range. The function then asks once more and names the problems. A second failure stores nothing.

## Prices

- Groq picks ingredient ids from `ulam-prices.ts`. It never gives a price. `priceIngredients` adds the total, so it is always correct.
- To correct a price, change that one file. The prices are estimates, so check them against your local market.
- The limit is `user_settings.ulam_limit`, from ₱20 to ₱99 (default ₱99). The prompt aims for about ₱50.

## Backup

When today's row is missing, `todayChoice` shows 3 of the 20 dishes in `lib/ulam-backup.ts`. The first change on that day stores them, so every device then matches.

## Pictures

Groq gives only text, so a dish has no photo. `UlamPicture` draws a simple bundled picture for each `kind`: egg, vegetable, beans, fish, meat or soup.

## Log

- "I ate this" sets `eaten`. "I ate something else" saves `custom`, with an optional price and calories, and the source `you`.
- `weekRows` always gives 7 rows, and `weekSummary` counts only eaten days. The daily run deletes older rows.
- Nothing goes to a calendar or to Money, and the module sends no notifications.

## Accuracy

Calories and cook times are estimates from the model, so the app shows "≈". Rice adds about 200 kcal for 1 cup.
