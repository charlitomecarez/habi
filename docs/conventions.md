# Conventions and known problems

`CLAUDE.md` at the repository root has the full project rules. This page adds the working details.

## Commands

| Task             | Command                                                           |
| ---------------- | ----------------------------------------------------------------- |
| Web              | `npm run web`                                                     |
| Android build    | Build from GitHub in expo.dev. No local build and no `eas build`. |
| Type check       | `npm run typecheck`                                               |
| Lint             | `npm run lint`                                                    |
| Tests            | `npm test`                                                        |
| Format           | `npm run format`                                                  |
| All three checks | `npm run check` (one at a time)                                   |
| Web build check  | `npx expo export --platform web --max-workers 1`                  |
| Apply migrations | `npx supabase db push --remote`                                   |
| Generate types   | `npm run db:types`                                                |

## Memory

This Mac has 8 GB of RAM. Run one heavy command at a time, and stop the dev server when you finish. `vitest.config.ts` sets one worker, so `npm test` is safe by default.

| Command                     | Measured peak |
| --------------------------- | ------------- |
| `npm run typecheck`         | 503 MB        |
| `npm run lint`              | 421 MB        |
| `npm test`                  | 154 MB        |
| Web build check (see above) | 595 MB        |

## Docker

Do not use Docker or a local Supabase server. That rule bans these commands, because each one needs Docker:

- `supabase start`
- `supabase db reset`
- `supabase functions serve`

`npx supabase db push --remote` and `npm run db:types` work on the linked live project, so they need no Docker. Without `--remote`, the CLI targets a local stack and fails.

## Tests

- **What to test:** pure logic that protects data or money: parsers, date and status helpers, and anything a mistake would corrupt silently. Screens are checked on the phone.
- **Where tests live:** next to the code, as `name.test.ts`. Vitest runs `lib/**/*.test.ts` and `supabase/functions/_shared/**/*.test.ts`.
- **Files that import `lib/supabase`:** add `vi.mock("@/lib/supabase", () => ({ supabase: {} }))`, because it needs the React Native runtime.
- **Fixtures:** made-up rows only. Never commit a real statement, and never paste a real statement row into a test.
- **Type check:** `tsc` skips `supabase/functions`, so tests there run with no type check.

## Code rules

- Screens use hooks from `lib/`. They do not call `supabase` directly.
- Put Android-only APIs in a `name.ts` + `name.web.ts` pair. Screens never check `Platform.OS`.
- Do not send `user_id` from the app. The column default sets it.
- Put business rules that other clients or the Edge Function also need in the database (trigger or view), not in the app.
- Forms use react-hook-form with a zod v4 schema.
- Full-screen forms use `KeyboardScrollView`, so the focused field stays above the keyboard. Bottom sheets use `Sheet`, which moves up with the keyboard.
- Status text comes from helpers such as `dueText`, `renewalText` and `isOverdue`, so every screen uses the same words.
- Prettier: print width 120, double quotes, semicolons, trailing commas, and `prettier-plugin-tailwindcss`.
- Node 22 (`.nvmrc`). npm is the package manager.

## Known problems

- **Typed routes go stale.** After you add a route, run `npx expo customize tsconfig.json`. It needs no dev server.
- **Supabase auth deadlock.** Do not `await` a Supabase call inside `onAuthStateChange`. Use `setTimeout(..., 0)`.
- **libsodium on web.** `crypto_pwhash` is only in the sumo build. Files that use it call `loadSumoVersion()`.
- **Argon2id blocks the JS thread** for about one second on Android. `deriveKey` waits 50 ms first, so the spinner shows.
- **NativeWind rem.** Native uses rem = 14 px. Use named spacing tokens, not `h-28` or `h-1.5`.
- **NativeWind dark mode.** `darkMode` is `"class"` on purpose. `"media"` throws on web. Dark colours come from the CSS variables.
- **Native packages need a new build.** After you add a package with native code (for example `expo-camera`), start a new Build from GitHub in expo.dev. Do not build on this Mac.
- **`set-state-in-effect` lint rule.** Derive state from route params instead of copying it into state in an effect. Use `router.setParams` to clear a param.

## Hooks and CI

| When           | What runs                                                                            |
| -------------- | ------------------------------------------------------------------------------------ |
| Pre-commit     | `scripts/check-staged.mjs`, then Prettier and ESLint on staged files only            |
| Commit message | commitlint (Conventional Commits)                                                    |
| Pre-push       | Stops a push to `main`, then runs the type check and the tests, one at a time        |
| Each PR        | GitHub Actions runs the type check, lint and tests, so the full lint leaves this Mac |

- `check-staged.mjs` stops `.env` files, PDF files and any `EXPO_PUBLIC_` name outside the three allowed values.
- The `prepare` script is `husky || true`, so an install with no git folder, such as a build in expo.dev, does not fail.
- ESLint bans `Platform.OS` and hex codes in `app/`.

## Git

- Commit only when asked. Never commit to `main`.
- Use Conventional Commits, for example `feat(money): add exchange rates`.
- Never commit `.env`, a token or a secret.

## Agents and skills

The repo holds these in `.claude/`, so each machine gets the same set.

| Name                  | Type  | Use                                                   |
| --------------------- | ----- | ----------------------------------------------------- |
| `release-plan`        | Skill | Step 1 of [the release workflow](release-workflow.md) |
| `release-handoff`     | Skill | Step 2 of the release workflow                        |
| `release-development` | Skill | Step 3 of the release workflow                        |
| `release-farewell`    | Skill | Step 4 of the release workflow                        |
| `add-migration`       | Skill | A schema change, from the new file to the new types   |
| `ui-check`            | Skill | The Impeccable check for each UI change               |
| `rules-reviewer`      | Agent | Reviews a diff against the project rules              |
| `migration-reviewer`  | Agent | Reviews new migrations for RLS, ownership and safety  |
| `docs-checker`        | Agent | Checks that the docs and the release record match     |
| `ui-reviewer`         | Agent | Reviews UI changes with Impeccable                    |
