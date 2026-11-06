---
name: ui-check
description: Use when a my-app change adds or edits a screen, component, layout, style, token, icon, motion or UI copy, in app/, components/, tailwind.config.js or global.css
---

# UI check

Every UI change consults Impeccable. A UI change is not done until this check ran.

## Before you edit

1. Read `docs/design-system.md`.
2. For a new screen or flow, read its confirmed design in the release design artifact. If it has none, run `/impeccable shape <feature>`.
3. For any other UI edit, load the `impeccable` skill. Read its craft floor before the first edit.

## After you edit

1. Run `/impeccable audit <target>`.
2. Run `/impeccable critique <target>`.
3. Fix each real finding.
4. Before the PR, run `/impeccable polish <target>`.
5. Write the result in the PR under "Checks": the commands and the targets, what you fixed, and what you kept.

The `<target>` is the changed screen or component file.

## Rules

- `CLAUDE.md` and `docs/design-system.md` are the brief. They win over an Impeccable suggestion.
- Keep the tokens, the shared components, the accent rule and the section colours. Report a suggestion that breaks them, and do not apply it.
- A refinement keeps the current look. Run `bolder`, `overdrive`, `delight`, `colorize` and a redesign only when Charli asks.
- Run `init`, `document` and `doctor` only when Charli asks, because they write project files.
- Do not use `/impeccable live`. Its Apply action can start an agent with permission checks off.

## When Impeccable is not available

Stop the check, and tell Charli that `/impeccable` is not available. Write "Impeccable check not run" in the PR. Never report a check that did not run.
