# Money

**Files:** `lib/money.ts`, `app/(app)/(tabs)/money.tsx`, `app/(app)/money/`, `components/money/`, migration `...0700_money.sql`.

## Defaults

After sign-in the app calls `seed_money_defaults()`. When the user has no accounts or categories, it adds:

- Accounts: Cash on hand, GCash, MariBank, GoTyme.
- Expense categories: Food, Groceries, Transport, Motorcycle, Bills & utilities, Subscriptions, Shopping, Health, Entertainment, Other.
- Income categories: Salary, Freelance, Other income.

## Accounts and balances

- `useAccounts()` reads the `money_account_balances` view.
- Balance = the number you set in `opening_balance`. Transactions never change it.
- `/money/accounts` adds accounts and sets the balance (`AccountSheet`). The More tab links to it.
- Home and the Money hero show the total of PHP accounts only.

## Transactions

| Kind       | Fields                                                                         |
| ---------- | ------------------------------------------------------------------------------ |
| `expense`  | `account_id`, `category_id` (optional), `merchant`, optional `subscription_id` |
| `income`   | `account_id`, `category_id` (optional), `merchant`                             |
| `transfer` | `account_id` (from), `to_account_id`, no category, no merchant                 |

- `amount` is always positive. `kind` sets the direction.
- A database check makes a transfer have a different `to_account_id` and no category.
- `useSaveTransaction` clears the fields that the kind does not use before it saves.
- `TransactionForm`:
  - A segmented control picks the kind.
  - Category chips toggle (a second tap clears the category).
  - The "Where / note" field saves to `merchant`, or to `note` for a transfer.
  - For an expense, chips under the field show past names (`suggestExpenseNames`). The chosen category's names come first, then the most used.
- `useTransactions("recent")` loads 10 rows. `"history"` loads 200.
- `useMonthSummary` totals spending and income for the current calendar month, and spending per category. Transfers do not count.

## Subscriptions

- `useSubscriptions()` reads the `subscription_costs` view: active rows, soonest renewal first, with `rateToPhp` and `monthlyPhp`.
- `monthlyPhp` = amount × rate × cycle factor (weekly 52/12, monthly 1, quarterly 1/3, yearly 1/12). It is null when a foreign currency has no rate. The totals leave it out and show a warning.
- `renewalText` gives the status word: overdue ("Renewed Mar 3, not logged"), "Renews today", soon (14 days or fewer), or later.
- The Money tab lists subscriptions that renew in the next 30 days (`RENEWAL_LIST_DAYS`).
- **Reminder:** `subscriptions_sync_reminder` keeps one pending reminder at 09:00 local time, `remind_days_before` days before `next_billing_on`.
- **Log payment:** the subscription form opens a new transaction with `subscriptionId`, merchant, account and category filled in. The amount is filled in only for PHP, because a foreign charge has a different peso amount.
- **Advance:** when a transaction with `subscription_id` is inserted, `advance_subscription` moves `next_billing_on` forward one cycle. It does this only if the payment date is no earlier than `next_billing_on − remind_days_before − 7` days. The reminder moves with it.

## Exchange rates

- The user sets one rate to PHP per foreign currency (`exchange_rates`). The app supports PHP and USD (`CURRENCIES`).
- `ExchangeRateSheet` saves a rate. The Subscriptions screen and the More tab open it.

## Helpers

- `formatPeso` → "₱1,234.50" or "−₱1,234.50". `formatMoney` → "USD 9.99" for a foreign currency.
- `parseAmount` accepts a positive number with at most two decimals, with or without commas and ₱. `parseBalance` also accepts zero and negative values.

## Future work

Statement import is not built. `transactions.source` and `transactions.external_ref` (unique per account) are ready for it. Do not build it unless asked.
