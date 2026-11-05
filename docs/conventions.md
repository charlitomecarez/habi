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
| Format check     | `npx prettier --check .`                                          |
| Web build check  | `npx expo export --platform web --max-workers 1`                  |
| Apply migrations | `supabase db push`                                                |
| Generate types   | `supabase gen types typescript --linked > types/database.ts`      |

Vitest runs the tests in `lib/**/*.test.ts`. The type check and the tests skip `supabase/functions`. To check parser code, use a short Node script in a scratch folder, not in the repository.

This Mac has 8 GB of RAM. Run one heavy command at a time, and stop the dev server when you finish.

## Code rules

- Screens use hooks from `lib/`. They do not call `supabase` directly.
- Put Android-only APIs in a `name.ts` + `name.web.ts` pair. Screens never check `Platform.OS`.
- Do not send `user_id` from the app. The column default sets it.
- Put business rules that other clients or the Edge Function also need in the database (trigger or view), not in the app.
- Forms use react-hook-form with a zod v4 schema.
- Status text comes from helpers such as `dueText`, `renewalText` and `isOverdue`, so every screen uses the same words.
- Prettier: print width 120, double quotes, semicolons, trailing commas, and `prettier-plugin-tailwindcss`.
- Node 22 (`.nvmrc`). npm is the package manager.

## Known problems

- **Typed routes go stale.** After you add a route, run `CI=1 npx expo start --port 8099`, wait for the types to generate, then stop it.
- **Supabase auth deadlock.** Do not `await` a Supabase call inside `onAuthStateChange`. Use `setTimeout(..., 0)`.
- **libsodium on web.** `crypto_pwhash` is only in the sumo build. Files that use it call `loadSumoVersion()`.
- **Argon2id blocks the JS thread** for about one second on Android. `deriveKey` waits 50 ms first, so the spinner shows.
- **NativeWind rem.** Native uses rem = 14 px. Use named spacing tokens, not `h-28` or `h-1.5`.
- **NativeWind dark mode.** `darkMode` is `"class"` on purpose. `"media"` throws on web. Dark colours come from the CSS variables.
- **Native packages need a new build.** After you add a package with native code (for example `expo-camera`), start a new Build from GitHub in expo.dev. Do not build on this Mac.
- **`set-state-in-effect` lint rule.** Derive state from route params instead of copying it into state in an effect. Use `router.setParams` to clear a param.

## Git

- Commit only when asked. Never commit to `main`.
- Use Conventional Commits, for example `feat(money): add exchange rates`.
- Never commit `.env`, a token or a secret.
