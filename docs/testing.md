# Testing

Habi has three kinds of tests. CI runs the first two on each pull request. You run the third on the phone.

| Kind        | Tool       | Where                                             | Runs in                         |
| ----------- | ---------- | ------------------------------------------------- | ------------------------------- |
| Unit        | Vitest     | `lib/`, `supabase/functions/_shared/`, `widgets/` | CI, the pre-push hook, this Mac |
| Web E2E     | Playwright | `e2e/`                                            | CI                              |
| Phone smoke | Maestro    | `.maestro/`                                       | The test phone                  |

## Unit tests

1. Run `npm test` for the tests only.
2. Run `npm run test:coverage` for the tests and the coverage gate.

The gate fails below 80% of lines in `lib/` and `supabase/functions/_shared/`. `vitest.config.ts` sets it. The gate leaves out the `.web.ts` files and the thin native adapters, such as `lib/location.ts`, because node cannot run a phone API. The phone tests cover them.

A test of a data hook mocks three modules:

- `@/lib/supabase` with `lib/test/fake-supabase.ts`. It records each call, and `respond()` queues the result of each awaited call.
- `@tanstack/react-query` with `lib/test/fake-query.ts`. A hook returns its options, and `runQuery()` or `runMutation()` runs them.
- `react`, only when the hook calls `useMemo` or `useEffect`, with `lib/test/fake-react.ts`.

`lib/inventory.data.test.ts` is a short example.

## Web E2E tests

CI builds the web export and runs `npm run test:e2e` against the live project. The tests sign in as the E2E account, add rows that start with `E2E`, and delete them at the end.

The E2E account is a normal account that the admin adds. Sign-up stays off. The setup signs in with the password in code, so the login screen does not change.

CI needs four GitHub Actions secrets. Without them, the E2E job skips and says so.

| Secret                  | Value                     |
| ----------------------- | ------------------------- |
| `E2E_EMAIL`             | The E2E account email     |
| `E2E_PASSWORD`          | The E2E account password  |
| `E2E_SUPABASE_URL`      | The live project URL      |
| `E2E_SUPABASE_ANON_KEY` | The live project anon key |

To run them on this Mac, which needs about 1 GB of free memory:

1. Export the four values in the shell, with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the project.
2. Run `npx expo export --platform web --max-workers 1`.
3. Run `npx playwright install chromium` once.
4. Run `npm run test:e2e`.

## Phone smoke tests

The seven Maestro flows open Home, add and delete a todo, add and delete an expense, open the vault, search More, swipe back from Weather, and drag the odometer sheet closed. Each flow starts signed in. The sheet flow needs a vehicle.

1. Install the Maestro CLI on the computer.
2. Connect the test phone with USB debugging on, and install the APK from expo.dev.
3. Sign in once.
4. Run `maestro test .maestro/`.

The flows add rows named "Maestro todo" and "Maestro expense", and delete them at the end.
