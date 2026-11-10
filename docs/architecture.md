# Architecture

## Start-up

`app/_layout.tsx` is the root layout. It does these steps:

1. It keeps the splash screen visible.
2. It wraps the app in `ThemeProvider` (navigation colours), `AuthProvider` and `QueryProvider`.
3. It loads the four Plus Jakarta Sans weights.
4. When the fonts load and the session is known, it hides the splash screen.
5. It renders a `Stack` with two `Stack.Protected` groups:
   - `(app)` when there is a session. Otherwise it redirects to `/login`.
   - `(auth)` when there is no session. Otherwise it redirects to `/`.

`app/(app)/_layout.tsx` registers for push notifications once (see [reminders.md](reminders.md)). It also lists every pushed screen. Forms open as modals (`presentation: "modal"`).

## Routes

| Route                                         | File                                | Kind   |
| --------------------------------------------- | ----------------------------------- | ------ |
| `/login`                                      | `app/(auth)/login.tsx`              | public |
| `/` (Home)                                    | `app/(app)/(tabs)/index.tsx`        | tab    |
| `/money`                                      | `app/(app)/(tabs)/money.tsx`        | tab    |
| `/todos`                                      | `app/(app)/(tabs)/todos.tsx`        | tab    |
| `/vehicle`                                    | `app/(app)/(tabs)/vehicle.tsx`      | tab    |
| `/more`                                       | `app/(app)/(tabs)/more.tsx`         | tab    |
| `/todo/new`, `/todo/[id]`                     | `app/(app)/todo/`                   | modal  |
| `/vehicle/log-service`                        | `app/(app)/vehicle/log-service.tsx` | push   |
| `/vehicle/mark-done`                          | `app/(app)/vehicle/mark-done.tsx`   | push   |
| `/inventory`                                  | `app/(app)/inventory/index.tsx`     | push   |
| `/inventory/locations`                        | `app/(app)/inventory/locations.tsx` | push   |
| `/inventory/scan`                             | `app/(app)/inventory/scan.tsx`      | modal  |
| `/inventory/item/new`, `/inventory/item/[id]` | `app/(app)/inventory/item/`         | modal  |
| `/money/accounts`                             | `app/(app)/money/accounts.tsx`      | push   |
| `/money/transactions`                         | `app/(app)/money/transactions.tsx`  | push   |
| `/money/subscriptions`                        | `app/(app)/money/subscriptions.tsx` | push   |
| `/money/transaction/new`, `/[id]`             | `app/(app)/money/transaction/`      | modal  |
| `/money/subscription/new`, `/[id]`            | `app/(app)/money/subscription/`     | modal  |
| `/vault`                                      | `app/(app)/vault/index.tsx`         | push   |
| `/vault/entry/new`, `/vault/entry/[id]`       | `app/(app)/vault/entry/`            | modal  |

Typed routes are on (`experiments.typedRoutes`). A new route needs regenerated types. See [conventions.md](conventions.md).

The URL scheme is `myapp`. A QR box label holds `myapp://inventory?location=<id>`, which opens `/inventory` with a `location` param.

## Auth

`providers/auth-provider.tsx` gives `useAuth()`, which returns `session`, `isLoading` and `signOut`.

- It reads the stored session with `supabase.auth.getSession()`.
- It follows changes with `supabase.auth.onAuthStateChange`.
- On `SIGNED_IN`, it calls the `seed_money_defaults` RPC in a `setTimeout`. An `await` inside the callback deadlocks Supabase. The RPC adds default money accounts and categories only once.
- `signOut()` locks the vault, signs out of Google, then signs out of Supabase.

Sign-in methods (`app/(auth)/login.tsx`):

- **Google on Android:** `lib/google-sign-in.ts` opens the native account picker. It sends the Google ID token to `supabase.auth.signInWithIdToken`.
- **Google on web:** `lib/google-sign-in.web.ts` calls `signInWithOAuth`, which redirects the page. The Supabase client uses the PKCE flow and `detectSessionInUrl` on web.
- **Email code:** `signInWithOtp` sends a 6-digit code. `verifyOtp` checks it. Resend delivers the email through Supabase SMTP.

`lib/supabase.ts` stores the session in AsyncStorage. On native, it refreshes tokens only while the app is in the foreground.

## Data fetching

- Each module has one file in `lib/` with its types, `useQuery` hooks, `useMutation` hooks and pure helpers.
- Screens call these hooks. Screens do not call `supabase` directly.
- `QueryProvider` saves the query cache on the phone (AsyncStorage) for 7 days, so a screen draws its last data at once and refreshes behind it. A new app version drops the saved cache. Sign out clears it.
- Never saved: the vault queries, decrypted photos, signed photo URLs and the job matches. `lib/query-cache.ts` has the list and the stale time of each kind: 30 seconds for todos, money, debts and reminders; 5 minutes for vehicle, inventory, health, people and settings; 30 minutes for news, sports and ulam; 24 hours for vehicle models. Others use 30 seconds.
- `lib/cache-json.ts` saves a Map, a Set or a Date as the same type, so a restored query has the shape its screen expects.
- Home calls `startHomeSummary()` first. Each Home query reads its rows from that one `home_summary` request with `fromHomeSummary()`, and falls back to its own request when there is no summary, it failed, or it does not fit (another month, another day, other leagues). A module screen on its own fetches as before.
- Mutations call `invalidateQueries` in `onSettled`. The database changes related rows with triggers, so the app reloads instead of patching the cache.
- Optimistic updates are used in two places: `useToggleTodo` and `useSaveUserSettings`.

Query keys:

| Key                                                                                | Hook file          |
| ---------------------------------------------------------------------------------- | ------------------ |
| `["todos"]`                                                                        | `lib/todos.ts`     |
| `["vehicle"]`, `["vehicle-service-due", id]`, `["odometer-last", id]`              | `lib/vehicles.ts`  |
| `["inventory-locations"]`, `["inventory-items"]`                                   | `lib/inventory.ts` |
| `["photo-urls", paths]`                                                            | `lib/photos.ts`    |
| `["money", ...]` (accounts, categories, subscriptions, rates, transactions, month) | `lib/money.ts`     |
| `["vault-settings"]`, `["vault-entries"]`, `["vault-biometric"]`                   | `lib/vault.ts`     |
| `["user-settings"]`                                                                | `lib/settings.ts`  |

Every money mutation invalidates the whole `["money"]` prefix, because a transaction changes the month summary and subscriptions.

## Platform adapters

Android-only APIs live behind a file pair: `name.ts` for native and `name.web.ts` for web. Metro picks the right file. Screens never check `Platform.OS`.

| Adapter                       | Native                                              | Web                       |
| ----------------------------- | --------------------------------------------------- | ------------------------- |
| `lib/google-sign-in`          | native Google picker + ID token                     | OAuth redirect            |
| `lib/push-notifications`      | Expo push token saved to `push_tokens`              | no-op                     |
| `lib/vault-biometric`         | SecureStore with `requireAuthentication`            | always off                |
| `lib/clipboard`               | clears only if the clipboard still holds the secret | clears without a check    |
| `components/ui/DateTimeField` | native date picker                                  | HTML date and time inputs |

`lib/supabase.ts` is the one file that reads `Platform.OS`, for the auth flow type.

## Theming

- The theme follows the phone or browser setting (`userInterfaceStyle: "automatic"`).
- `global.css` holds every colour token as an RGB CSS variable, with a dark set under `prefers-color-scheme: dark`.
- `tailwind.config.js` maps each token class to its variable.
- Props that need a colour string (icons, spinners, placeholders, navigation) use `useColors()` from `lib/colors.ts`.
- `lib/colors.ts` and `global.css` hold the same values. Change both together.

See [design-system.md](design-system.md) for the token list.

## Optional modules

- `lib/modules.ts` marks a module that needs a server key with `needs`: Sports needs `sports` (both sports keys); Find a work and Inbox need `ai` (Groq). News and Weather need none. A test fails if a module names an unknown feature.
- The `app-features` Edge Function answers which features are set up, as yes or no only. It never returns a key. `useFeatures` asks once an hour; while it loads, or if it fails, every feature counts as set up, so nothing flickers out.
- `useModuleFilter` joins the features, Settings › Modules (`user_settings.hidden_modules`) and the admin flag. More, the Home shortcuts, the Shortcuts sheet and the Home Games and News blocks use it.
- `ModuleGate` wraps the Sports, Find a work and Inbox screens. An old link to a module the server cannot run shows "… is not set up on this server". A module you only switched off still opens from a link.
