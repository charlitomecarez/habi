# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Charli is the admin and the primary user. Charli is a rider in the Philippines (Asia/Manila) with a motorbike and a Galaxy A56. Charli uses the app at four moments: a morning check before leaving, quick logs during the day, an evening review at home, and a tap on a reminder. A small number of other people can use the app. Only the admin adds them, and each account has fully separate data.

## Product Purpose

Habi is one private personal assistant. It remembers todos, services, bills, money, meals and documents, and it tells Charli when to act. Success means that Charli does not have to remember these things, and opens the app to act on what it says.

## Positioning

The app knows one real life: the vehicle and its kilometres, GCash and MariBank, ulam under ₱99, and voice messages in Taglish. A general todo or finance app cannot join these facts in one view.

## Operating Context

- A morning check: what is due, the weather, the money left, and the ulam.
- Short stops during the day, often outside and in sun: an expense, a fuel entry, a todo.
- An evening review at home: Inbox, Journal, Money.
- A tap on a reminder. A push can arrive up to 15 minutes late.

## Capabilities and Constraints

- Android first. This release targets the Android app only. The web build stays as it is.
- Expo, NativeWind and Supabase. Everything stays on free tiers.
- Tabs: Home, Money, Todos, Vehicle, More. More holds the other modules.
- Sign-up stays off. Only the admin adds accounts.
- Vault data is encrypted on the device.
- The app sends notifications only through the `send-reminders` Edge Function. Alarms are the one exception.

## Brand Commitments

- The name is Habi.
- Status always has a word, not colour alone.
- Touch targets are at least 48 px.
- Copy uses sentence case, and buttons name the action.
- The visual identity is open in v1.3.0: Charli approved a replacement of the colour, the type and the cards.

## Evidence on Hand

Real content exists in the app: pesos, kilometres, service intervals, Filipino dishes, GCash and MariBank rows. Artifacts and images use example data only. Do not publish real money figures, names or statement rows.

## Product Principles

1. The app speaks first. It says what needs action, and the person does not have to look for it.
2. One view of today beats a list of modules.
3. Numbers are the content. Money, kilometres and hours lead each screen.
4. A log takes seconds, with one hand, outside.
5. Private by default. Personal data stays in the account, and health data stays on the phone.

## Accessibility & Inclusion

The app must stay readable at the largest Samsung font size and on a narrow phone. Text must wrap or shrink by design, and must never overlap. The app respects the reduce-motion setting.
