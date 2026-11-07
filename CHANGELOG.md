# Changelog

This page lists the changes in each release, with the newest release first. It gives one line for each change. The [release records](docs/releases/index.md) hold the full notes and the artifacts.

## What goes here

Each release section has this form:

```md
### Fixed

- **Statement import:** PDF import works on Android again, for every bank. Install the new APK.
- **Statement import:** A server failure no longer asks you to check your connection.
- **Vehicle:** Update odometer accepts a lower number after a confirm step, to fix a wrong reading. A lower reading stops reminders that are no longer true. This changes the old rule that the odometer never goes down.
- **Inbox:** Play audio now shows Loading, the time while it plays, and an error with Try again.

## [v1.2.2](docs/releases/v1.2.2.md) - 2026-11-06

### Added

- **Area:** One sentence about the change.
```

- **Heading:** The version, a link to the release record, and the release date in `YYYY-MM-DD` form.
- **Types:** Use only the types that the release needs, in this order: Added, Changed, Fixed, Removed, Security.
- **Lines:** Start with the module or the area in bold. Say what changed for the person who uses the app or works on the repo.
- **Actions:** Name each thing that a person must do, for example turn on a setting or install a new APK.
- **Behaviour changes:** Name each change to old behaviour, even if the release note calls it a fix.

Do not put these items here:

- The plan, the milestones, branch names and PR numbers.
- Refactors and other work that changes no behaviour.
- Test results. "Not tested yet" stays in the release record.
- Names, account numbers, keys and real statement rows.

## How to keep it current

1. During Development, add each change to `Unreleased` in the same PR.
2. At Farewell, move the lines to a new section for the version.
3. Leave `Unreleased` in place, with no lines, for the next release.

## Unreleased

### Added

- **Release workflow:** Each release has five steps: Planning, Design, Handoff, Development and Farewell. Charli gates each step.
- **Design step:** A design artifact holds the UI and DB design of each milestone. Charli can ask for revisions before the handoff.
- **Release records:** `docs/releases/` has one page for each release, and an index of the artifacts.
- **Changelog:** This page lists the changes in each release.
- **Project agents and skills:** `.claude/` holds the release skills and the review agents.
- **Database backup:** A daily job saves an encrypted copy of the database for 30 days. Storage files are not in it. Add two GitHub secrets to turn it on.
- **RLS check:** A script proves on the live project that one account cannot reach the rows of another. It needs two test accounts.
- **Money:** Recurring expenses and income save themselves on the days you pick, with an Auto label. You can delete a day, or pause a rule.

### Changed

- **Accounts:** The repo now records that sign-up is off. Only people the admin adds can use the app.
- **UI changes:** Each UI change now needs the Impeccable check.

## [v1.2.2](docs/releases/v1.2.2.md) - 2026-11-06

### Added

- **Voice Inbox:** Record a message in the app. The other person reads the text from Groq Whisper. Inbox and Sent show Play audio and Retry. The audio is deleted after 7 days, and the text stays.
- **Voice push:** A voice message sends a push at once, with no message text. Tapping the push opens Inbox.
- **Accounts:** Anyone can create an account. Each account has separate data.
- **Voice access:** Only the admin ticks the accounts that can use voice messages. A ticked account and the admin can message each other.

### Changed

- **Ulam:** Only the admin and ticked accounts get a Groq ulam. Other accounts see the bundled ulam.
- **Android:** The app asks for microphone access. Install `my-app-1.2.2.apk` over the current app. This APK also holds all of v1.2.1.

## [v1.2.1](docs/releases/v1.2.1.md) - 2026-11-06

### Added

- **Alarms:** A native alarm rings on a locked phone and survives a restart. To stop it, scan the printed label and answer sums. An awake check follows.
- **Ulam:** A daily job asks Groq for ulam. Each ulam shows prices and steps. The module keeps a 7-day log.
- **Travel:** Plan trips with days, ideas, a budget and reminders. Export PDF makes a day-by-day plan on the phone.
- **Vault backups:** Export backup saves the encrypted rows. Restore backup puts them into an empty vault.

### Changed

- **Look:** Each section has its own colour pair. The open tab has a filled icon on a tinted pill. Motion stops when reduce motion is on.
- **Home:** Home has a Today card, one merged Needs attention list and shortcuts you pick.
- **More:** More is a searchable grid in four sections. Each tile shows how much is inside. Settings is at the end of More.
- **Docs and checks:** The repo has nine new module docs, commit hooks, CI, new lint rules and parser tests.

### Security

- **Master password:** A new vault needs 16 or more characters and refuses common passwords.
- **Clipboard:** Android marks copied passwords as sensitive. The app clears them, also in the background.
- **Screenshots:** Vault screens and decrypted photos block screenshots.
- **Auto-lock:** The vault locks after 1 minute in the background and 2 minutes idle.

## [v1.2.0](docs/releases/v1.2.0.md) - 2026-11-05

### Added

- **Statement import:** Money > Import statement reads GoTyme, GCash and MariBank PDFs. The app saves only the ticked rows. A totals mismatch stops the import.
- **Expense names:** Past expense names show as chips in the transaction form.
- **Spending by category:** Previous and next month buttons show other months.
- **More photo:** The More screen shows the Google photo, or the first letter.

### Changed

- **Debts:** A debt payment no longer adds a Money transaction.

### Fixed

- **Account balances:** Logging no longer changes account balances. Each balance is the number you type. No transaction is deleted.
- **Keyboard:** The focused field scrolls above the keyboard on Android.
- **Home photo:** The Home screen shows the Google photo.

## [v1.1.0](docs/releases/v1.1.0.md) - 2026-11-05

### Added

- **Money:** The release adds a daily spending calendar, bills with a changing amount, monthly budgets and savings goals.
- **Subscriptions:** On the billing day, an hourly job adds the expense once. Existing subscriptions start with auto-add off, so turn it on for each one.
- **New modules:** Content planner, Debts, People and dates, Documents and renewals, Habits, Gym, Shopping list, Journal and Health.
- **Fuel log:** Each fill-up writes the odometer and the expense. The Vehicle tab shows km per litre and the fuel cost this month.
- **Warranties and receipts:** Inventory items hold the purchase date, price, receipt photo and warranty end.
- **Screen time:** Home shows the screen time on Android. It needs Usage access, and the data stays on the phone.
- **Daily tip:** A new tip arrives at 12:00 AM PHT. A bundled tip shows if the new tip is missing.
- **Weekly review:** On Sundays, Home and an email show money, todos, the next service, videos, habits and gym.
- **Brand icons:** The app knows 125 brands, and the icons are bundled.
- **Theme:** Pick Same as the phone, Light or Dark.
- **Quick unlock:** The Vault offers Off, Fingerprint only or Face or fingerprint. Fingerprint only is the default.

### Changed

- **Email templates:** The daily digest, the Sunday review and the six sign-in emails use the app look.

### Fixed

- **Vault:** The vault accepts the correct master password on Android.
- **Keyboard:** The keyboard no longer covers forms and sheets on Android.
- **Sign-in:** The email sign-in screen takes the 8-digit code.

## [v1.0.0](docs/releases/v1.0.0.md) - 2026-11-04

### Added

- **Sign in:** Google sign-in works on Android and on the web.
- **Todos:** Todos have a due date, a priority, a repeat, push reminders and a daily email digest.
- **Vehicle:** Log the odometer and each service. The Honda ADV 160 service intervals are built in.
- **Inventory:** Store items in nested locations, with photos, search and QR labels.
- **Money:** Track accounts, expenses, income, transfers and subscriptions.
- **Vault:** Store passwords, encrypted on the device. Supabase holds only the ciphertext.
- **Design:** The app has light and dark themes and a new app icon.
