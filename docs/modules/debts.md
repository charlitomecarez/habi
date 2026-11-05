# Debts

**Files:** `lib/debts.ts`, `app/(app)/debts/`, `components/debts/`, migrations `...000400_debts` and `...20261105000100_manual_balances`.

- `debts` holds one row per debt, with a direction: `owed_to_me` or `i_owe`.
- `debt_payments` holds partial or full payments.
- The `debt_balances` view gives the amount paid and what is left. Paid debts stay, so the history stays.
- `debtStatus` always gives a word: Paid, Overdue, Due today or a due date.

## Money

- Since v1.2.0, `record_debt_payment` adds nothing to Money. Account balances are numbers you set, so logging never changes them.
- The `p_account_id` argument stays optional so the v1.1.0 app can still call it. The function ignores it.
- Old payments keep their `transaction_id`. Deleting one still removes its old transaction, through a trigger.

## Reminders

Source `debt`. One push at 9:00 on the due date, while something is left.
