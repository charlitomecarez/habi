# Shopping list

**Files:** `lib/shopping.ts`, `app/(app)/shopping/`, migration `...000900_shopping`.

- `shopping_items` is one list per user. You tick items at the counter and type the price.
- `shopping_history` remembers items you bought before, with the last price, for suggestions. Names are unique in any case.
- `useCheckout` calls `shopping_checkout`. It adds one Money expense with the total of the ticked items, then removes them. Unticked items stay.
- Checkout refuses to run when nothing is ticked.
- Checkout does not change an account balance.
- The module sends no reminders.
