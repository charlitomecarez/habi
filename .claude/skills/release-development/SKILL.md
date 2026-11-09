---
name: release-development
description: Use when Charli confirms a Habi handoff and asks to start coding, or to continue a milestone, a release branch or a release PR
---

# Release development

This skill is step 4 of `docs/release-workflow.md`. Read that page first. It wins on any conflict.

## Before you start

1. Read the handoff and design artifacts for the version.
2. Set the status to `Development` in `docs/releases/v<version>.md` and `docs/releases/index.md`.
3. Check that `r/v<version>` exists and that it comes from `main`.

## Each milestone

1. Cut the milestone branch from the release branch.
2. Do only the work in the milestone. Follow the confirmed design. Name any other problem in one sentence.
3. For a schema change, use `add-migration`.
   For a UI change, use `ui-check`.
4. Update the docs in the same change. Add each change to `Unreleased` in `CHANGELOG.md`.
5. Run `npm run typecheck`, `npm run lint` and `npm test`, one at a time.
6. Check each "Done when" item. Report any item that only Charli can check.
7. Commit and open a PR into the release branch when Charli asks.

If the work must change the confirmed design, ask Charli first. Then add a revision to the design artifact.

Use the `rules-reviewer`, `migration-reviewer`, `docs-checker` and `ui-reviewer` agents when Charli asks for a review.

## After the last milestone

1. Set the version in `app.json`, `package.json` and `package-lock.json`. Use the commit subject `chore(release): set version <version>`.
2. Open the release PR into `main`. Do not merge it.
3. Give Charli a list of phone tests for the Galaxy A56.
4. Tell Charli when a new Build from GitHub in expo.dev is necessary.

Never run `npx expo run:android`, `eas build` or a local Android build. Stop each dev server when you finish.

## Gate

Stay in this step until Charli confirms that development is done. Passing checks do not end this step. Do not start Farewell until Charli asks for it.
