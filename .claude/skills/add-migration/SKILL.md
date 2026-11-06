---
name: add-migration
description: Use when a my-app change needs a new table, column, view, trigger, policy or any other Supabase schema change
---

# Add a migration

## Steps

1. Read `docs/database.md`. Read the DB design of the milestone if the release has one.
2. Add a new file `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`. Its timestamp must come after the last file. Never edit an applied migration.
3. Give each user-owned table `user_id uuid not null default auth.uid() references auth.users (id) on delete cascade`.
4. After each user-owned table, add `select public.apply_owner_rls('public.<table>');`.
5. Create each view `with (security_invoker = true)`.
6. Check that the app does not send `user_id`. The column default sets it.
7. Ask Charli before you apply the migration, because the project is live.
8. Run `npx supabase db push --remote`.
9. Run `npm run db:types`.
10. Update `docs/database.md`, and update the module page in `docs/modules/`.

## Rules

- Use no Docker and no local Supabase server. Never run `supabase start`, `supabase db reset` or `supabase functions serve`.
- A notification comes from a row in `public.reminders`. Only `send-reminders` sends it.
- A child row must point to a parent row of the same user. Use an owner trigger, as `check_vehicle_owner` does.
