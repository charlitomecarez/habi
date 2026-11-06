---
name: release-handoff
description: Use when Charli confirms a my-app plan and asks for the handoff, the milestones or the developer artifact of a release
---

# Release handoff

This skill is step 2 of `docs/release-workflow.md`. Read that page first. It wins on any conflict.

The output is one new artifact. Keep the plan artifact as it is. This step changes no code.

## Steps

1. Read the plan artifact for the version and each answer in its `decisions` collection.
2. If a plan question has no answer, ask Charli before you continue.
3. Check the repo again. Note the commit that you read.
4. Read the format source with the Artifact `read` action: https://claude.ai/artifact/UFZThwwvdcztdnyvFiWHB7
5. Publish a new artifact with that layout. Set the `<title>` to exactly `my-app v<version> handoff`.
6. Link the artifact in `docs/releases/v<version>.md` and `docs/releases/index.md`. Set the status to `Handoff`.
7. Send Charli the link, then stop.

## Each milestone holds

- A number and a title.
- A type label: Setup, Feature, Fix, Docs or Release.
- A difficulty label: Easy, Medium or Hard.
- A label for each special need: Migration, New APK or Blocked.
- The branch name.
- The work, with file paths.
- A "Done when" list. Each item is a thing that a person can check.

## Gate

Stay in this step until Charli confirms the handoff in a message. Do not write code until Charli asks for it. Use `release-development` for that step.
