---
name: release-handoff
description: Use when Charli confirms a Habi design and asks for the handoff, the milestones or the developer artifact of a release
---

# Release handoff

This skill is step 3 of `docs/release-workflow.md`. Read that page first. It wins on any conflict.

The output is one new artifact. Keep the plan and design artifacts as they are. This step changes no code.

## Steps

1. Read the plan artifact for the version and each answer in its `decisions` collection.
2. Read the confirmed design artifact for the version. If the record says "Not needed", skip this read.
3. If a plan question has no answer, ask Charli before you continue.
4. Check the repo again. Note the commit that you read.
5. Read the format source with the Artifact `read` action: https://claude.ai/artifact/UFZThwwvdcztdnyvFiWHB7
6. Publish a new artifact with that layout. Set the `<title>` to exactly `Habi v<version> handoff`.
7. Link the artifact in `docs/releases/v<version>.md` and `docs/releases/index.md`. Set the status to `Handoff`.
8. Send Charli the link, then stop.

## Each milestone holds

- A number and a title.
- A type label: Setup, Feature, Fix, Docs or Release.
- A difficulty label: Easy, Medium or Hard.
- A label for each special need: Migration, New APK or Blocked.
- The branch name.
- The work, with file paths.
- A "Done when" list. Each item is a thing that a person can check.
- The part of the design that the milestone builds, or "Not needed".

## Gate

Stay in this step until Charli confirms the handoff in a message. Do not write code until Charli asks for it. Use `release-development` for that step.
