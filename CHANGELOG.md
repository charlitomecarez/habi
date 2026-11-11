# Changelog

This page lists the changes in each release, with the newest release first. It gives one line for each change. The [release records](docs/releases/index.md) hold the full notes and the artifacts.

## What goes here

Each release section has this form:

```md
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

- Places near you in Travel: sights, food, parks and shopping within 10 km, with Open in Maps and Add to a trip. Your exact spot stays on the phone.
- Place suggestions in a trip item, from Photon.
- YouTube in Daily life: the new videos of the channels you follow, newest first. Add a channel by its link or @handle.
- Movies in Daily life: the films in Philippine cinemas now and the next ones, from TMDB, with a film screen and its trailer.
- F1 and MotoGP in Sports: the next race in PHT, the last result, the rounds and the standings. A Show on Home switch puts the next race and the winner in Home Games.
- Unit coverage gate at 80% of lines in CI, web E2E tests with Playwright, and five Maestro phone flows. See `docs/testing.md`.

## [v1.5.0](docs/releases/v1.5.0.md) - 2026-11-11

### Added

- **Health:** A 6 PM health check gives you 1 to 3 tips each evening from your sleep, steps and weight trend. It is off until you turn it on in Steps and sleep. While it is on, your sleep and steps go to your account and, with no name, to Groq. Turning it off deletes them.
- **Weather:** A World section shows the weather and local time in up to 6 places, starting with Hong Kong, Tokyo, Rome, Los Angeles and New York. Edit places adds and removes them. The places stay on the phone.
- **Settings:** A Speed check row shows how fast your last 50 requests were, with the typical time, the slowest request and a Fast, Slow or Very slow word. The times stay on the phone.
- **Sleep:** Steps and sleep shows This week and Last week: a bar for each night, a sleep score from 0 to 100 with Rested, Fair or Poor, and your usual bedtime. Tap a night to fix its times.
- **Health Connect:** The app reads last night's sleep and your weight from Samsung Health through Health Connect. Sleep stays on the phone. A weight saves to your account and says "From Samsung Health". A weight that you type on the same day wins, and a weight that you delete does not come back. Needs the v1.5.0 APK, and a tap on Allow sleep and weight if you allowed only steps before.
- **CI:** Each PR checks the web bundle against a size budget and runs Lighthouse on the web app.

### Changed

- **Speed:** The app keeps your last data on the phone for a week, so screens open with data at once and refresh behind it. Home loads in one request instead of about 25. Sign out clears the saved data.
- **Server:** The database moved to Singapore, closer to the Philippines, so each request is faster. Install the v1.5.0 APK: older APKs stop working when the old server pauses.
- **Photos:** New photos save as WebP, about half the size, and Inventory lists load a small copy. A photo you have seen once opens from the phone without a new download. Older photos stay as they are.
- **Ulam:** Three dish photos load a smaller copy from Wikimedia.
- **Vehicle:** Add vehicle starts with a Model field. The Honda ADV 160 is picked for you, and Another model says why it is not ready yet.

### Fixed

- **Sheets:** Save teams, Save modules and Save settings stay in view at the bottom of their sheets, above the navigation bar, so you no longer scroll past every row to find them.

## [v1.4.1](docs/releases/v1.4.1.md) - 2026-11-10

### Changed

- **Name:** The app is now called Habi, Tagalog for "weave". The package and the link scheme stay the same, so the new APK installs over the old one.
- **Backup:** The daily encrypted database backup runs in a separate private repo, so its run logs and files stay private.
- **Docs:** The docs use general terms instead of personal details.

## [v1.4.0](docs/releases/v1.4.0.md) - 2026-11-10

### Added

- **News:** Headlines from seven outlets, Philippines first, with images, a story page and an in-app browser.
- **Sleep:** The app finds last night's sleep from when the screen was off. You can still fix the times. Needs the v1.4.0 APK.
- **Screen time:** A screen lists every app, today and this week.
- **Loading:** Screens show a skeleton in their shape while they load.
- **Home:** Your photo, the games of the teams you follow in Sports (up to 12), and three headlines.
- **Vault:** A 6-digit PIN unlocks the vault on your phone. A recovery key, with a code to your email, resets a forgotten master password, and you can now change the master password. Your logins are not encrypted again. Needs the v1.4.0 APK.
- **Modules:** Settings › Modules hides the modules that you do not use. A module that the server has no key for hides by itself.
- **Tabs:** A tap on a tab slides to it, unless reduce motion is on.
- **Repo:** The MIT licence and a setup guide.

### Changed

- **Email:** The digest uses the Banig look. The sign-in emails use it after you paste the six templates in the Supabase dashboard.
- **Find a work:** Jobs that Groq cannot rank save as "Not ranked", and get a rank on the next run. Install the v1.4.0 APK before the new search goes live.
- **Delete:** Every delete asks in one sheet at the bottom of the screen.

### Fixed

- **Keyboard:** The keyboard no longer covers a text field on any screen.
- **Sports:** NBA teams show their logos.

### Removed

- **Sleep:** The daily "Log last night's sleep" prompt on Home and in Steps and sleep.

## [v1.3.0](docs/releases/v1.3.0.md) - 2026-11-07

### Added

- **Release workflow:** Each release has five steps: Planning, Design, Handoff, Development and Farewell. Charli gates each step.
- **Design step:** A design artifact holds the UI and DB design of each milestone. Charli can ask for revisions before the handoff.
- **Release records:** `docs/releases/` has one page for each release, and an index of the artifacts.
- **Changelog:** This page lists the changes in each release.
- **Project agents and skills:** `.claude/` holds the release skills and the review agents.
- **Database backup:** A daily job saves an encrypted copy of the database for 30 days. Storage files are not in it. Add two GitHub secrets to turn it on.
- **RLS check:** A script proves on the live project that one account cannot reach the rows of another. It needs two test accounts.
- **Money:** Recurring expenses and income save themselves on the days you pick, with an Auto label. You can delete a day, or pause a rule.
- **Ulam:** Dishes show a real photo that stays on the phone. A dish with no photo keeps its drawing.
- **Report a bug:** Any account can send a bug or an idea from More. The admin gets a push and reads it on the Reports screen.
- **Reminders:** A tap on a reminder opens its item, not Home.
- **Weather:** Home shows the temperature and the rain chance for a place you pick. Tap it for the forecast. Your location is optional.
- **Steps and sleep:** Home shows your steps from Health Connect, and the sleep that you type. Both stay on the phone.
- **Sports:** Matches and standings for five football leagues and the NBA, in More. A tap on a match opens a web search. Scores are delayed, and the app shows no live scores.
- **Find a work:** For the admin. The app finds and ranks jobs each day, drafts a cover letter when you ask, and opens the application. You press Submit on the employer page.
- **Widgets:** Two Android home screen widgets show last night's sleep and today's screen time. They show nothing personal after sign-out.
- **Vehicle:** CVT cleaning and steering bearings join the service list.
- **Vehicle:** Checks holds the before-riding and weekly lists. Ticks stay on the phone, and they clear each day and each Monday.

### Changed

- **New look:** my-app has a new look, Banig: woven colour, a new font and larger touch targets. Install the new APK.
- **Accounts:** The repo now records that sign-up is off. Only people the admin adds can use the app.
- **UI changes:** Each UI change now needs the Impeccable check.
- **README:** The banner shows the new look with sample data, and the text covers all nine Edge Functions and the backup.
- **Design:** Every tab and module now follows the v1.3.0 mocks. Rows replace the information cards, and each module has its section header.
- **Home:** The amount sits inside the sentence, rows show their number, and you can pull down to try again.
- **Money:** A chart of this week and a Today list come first. Whole amounts drop ".00".
- **Todos:** All is the first filter, and the list has Overdue, Today and Later groups.
- **Vehicle:** Bars show the distance used, and Fuel shows the average and the last fill-up.
- **More:** Each module has its icon in its section colour, and so do the Home shortcuts.
- **Vehicle:** ADV 160 intervals follow the updated maintenance checker: engine oil every 1,500 km, gear oil and brake pads 3,000 km, air filter 6,000 km, drive belt 12,000 km and battery 6 months. A custom interval stays.
- **Money:** Accounts are now swipeable cards with a woven edge, under the chart.
- **App icon:** The icon and the favicon are now indigo and cream, to match the theme.
- **Journal:** A tap on an entry opens it to read, with the full text, the photo and links to the older and newer entries. The pencil opens the form.
- **Weather:** It is now in More too, and Home says "Add your weather" until you pick a place.
- **Weather:** The screen and the Home line show icons for sun, cloud, rain and storm, with the moon at night.
- **Sports:** Standings use the design's columns, and NBA shows a win rate. Football teams show their crest, and NBA teams show their short code.

### Fixed

- **Statement import:** PDF import works on Android again, for every bank. Install the new APK.
- **Statement import:** A server failure no longer asks you to check your connection.
- **Vehicle:** Update odometer accepts a lower number after a confirm step, to fix a wrong reading. A lower reading stops reminders that are no longer true. This changes the old rule that the odometer never goes down.
- **Ulam:** Show another stops at the third dish, and chips go back to any of the three.
- **Inbox:** Play audio now shows Loading, the time while it plays, and an error with Try again.
- **Navigation:** Back and Save go to Home when no screen is behind them, such as after a reload or a reminder tap.

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
