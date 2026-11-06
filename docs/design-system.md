# Design system

## Rules

- Use token classes only. Do not put hex codes or bare pixel values in screens or components.
- Build screens from `components/ui/`.
- Use one primary action per screen. The accent colour marks the primary action, the open tab and the one Today card on Home.
- Section colours are only for icons and tiles. They never show status.
- Motion stays short and stops when the phone's reduce-motion setting is on. Use `FadeIn` and `PressScale`.
- A touch target is at least 44 px (`h-touch`). An icon-only button needs an `accessibilityLabel`.
- A status always has a word (Overdue, Today, Due soon), not only a colour.
- Use sentence case. A button names its action ("Save expense"). An optional field says "(optional)" in its label.
- Use borders, not shadows. Only the FAB has a shadow.
- Inputs use 16 px text (`text-body`).
- A form with more than three fields is a full screen. A form with one or two fields is a bottom sheet.

## Impeccable check

Every UI change consults [Impeccable](https://impeccable.style), so that AI slop does not reach the app. A UI change is a change to a screen, a component, a layout, a style, a token, an icon, motion or UI copy.

1. Before you edit, follow the `ui-check` skill. A new screen starts from its confirmed design. If it has none, it starts with `/impeccable shape`.
2. After you edit, run `/impeccable audit` and `/impeccable critique` on the changed files.
3. Fix each real finding.
4. Before the PR, run `/impeccable polish`.
5. Write the result in the PR.

This page and `CLAUDE.md` win over an Impeccable suggestion. On each machine, run `/plugin install impeccable@impeccable` once. Without the plugin, the check cannot run.

## Tokens

All tokens are in `tailwind.config.js`. Colour values are in `global.css` (light and dark).

- **Colours:** `surface-page`, `surface-card`, `surface-muted`, `border`, `border-input`, `border-dashed`, `divider`, `ink`, `ink-muted`, `on-accent`, `accent`, `accent-strong`, `accent-tint`, `warning`, `warning-tint`, `warning-ink`, `danger`, `danger-tint`, `fab-shadow`, `scrim`.
- **Section colours:** `daily`, `people`, `home`, `records`, each with a `-tint`. The colour on its tint passes 4.5:1 in light and dark. They are in `global.css` and `lib/colors.ts`.
- **Fixed colours:** `label-paper` (white) and `label-ink` (black). Only the printed QR label uses them, so a camera can read it in both themes.
- **Font families:** `font-sans` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700).
- **Font sizes:** `display` 34, `amount-input` 32, `title-lg` 26, `title` 20, `heading` 16, `body` 16, `row-title` 15, `label` 14, `caption` 13, `badge` 12, `tab-label` 11.
- **Spacing:** `1`–`6` and `8` (4 px steps), `bar` 6, `chip` 40, `touch` 44, `input` 52, `button` 56, `slot` 64, `amount` 72, `field-sm` 110, `tile` 112.
- **Radius:** `sm` 10, `md` 12, `input` 14, `card` 16, `fab` 18, `hero` 20, `sheet` 28, `pill` 999.

Do not use Tailwind's default numeric scale outside `1`–`8`, for example `h-28` or `h-1.5`. NativeWind uses rem = 14 px on native, so those classes give a different size on Android and web. Add a named token instead.

## Shared components (`components/ui/`)

| Component       | Use                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `Button`        | Variants `primary`, `secondary`, `destructive`. Sizes `button` (56) and `input` (52). Has `loading` and `icon`. |
| `Input`         | Labelled text field with an error line.                                                                         |
| `PasswordInput` | Text field with a show or hide button. `emphasis` adds a 2 px accent border.                                    |
| `AmountInput`   | Large amount field. `unitPosition` puts the currency before or after.                                           |
| `Select`        | Field that opens an `OptionSheet`. `optional` allows no value.                                                  |
| `OptionSheet`   | Radio list in a `Sheet`.                                                                                        |
| `Segmented`     | Segmented control for two to four choices.                                                                      |
| `Chip`          | `choice` (form) or `filter` (list filter, filled when selected).                                                |
| `DateTimeField` | Date or date-and-time field. Has a `.web.tsx` version.                                                          |
| `Stepper`       | − and + buttons around a number field.                                                                          |
| `PhotoField`    | Photo picker. `tiles` layout (camera and library tiles) or `single` layout (one button that asks).              |
| `DashedButton`  | Dashed "add" button. Shapes `tall` and `wide`.                                                                  |
| `LetterAvatar`  | First letter on a token colour picked from a hash of the name.                                                  |
| `Badge`         | Status word. Tones `danger`, `warning`, `neutral`.                                                              |
| `Notice`        | Message box. Tones `warning` and `danger`.                                                                      |
| `Fab`           | Floating action button. The one primary action on a list screen.                                                |
| `ScreenHeader`  | Screen title.                                                                                                   |
| `Sheet`         | Bottom sheet.                                                                                                   |
| `TabBar`        | The app's tab bar. The open tab has a filled icon on a tinted pill. Its height follows the bottom inset.        |
| `HeroCard`      | The one solid accent card on a screen: a sentence and up to three numbers.                                      |
| `ModuleTile`    | A module in a grid, with a section colour. Tones `accent`, `daily`, `people`, `home`, `records`.                |
| `EmptyState`    | A drawing, a sentence and one action. Drawings `list`, `box`, `calendar`, `bowl`.                               |
| `FadeIn`        | A short fade for a list or section.                                                                             |
| `PressScale`    | A `Pressable` that shrinks a little on press.                                                                   |

Screens build cards and rows with token classes (`rounded-card border border-border bg-surface-card`). There is no `Card` or `ListRow` component.

The source for the design is the Design canvas at https://claude.ai/artifact/7y38Um2ktJD5s9uatQ3yFy (9 screens, 8 forms).

## Known differences from the design

- Icons are Ionicons, not the line icons in the design.
- Sizes between token steps snap to the nearest token.
- `LetterAvatar` uses token colours only.
- The expense form shows all categories, not six and "More…".
- Some extra parts stay: the Recent list on Money, "Mark services done" and "Log another service" on Vehicle, back buttons on Inventory and Vault, and the fingerprint switch on Vault.
