---
name: release-plan
description: Use when Charli gives concerns for a my-app release and asks for a plan or a planning artifact, or starts a new release version
---

# Release plan

This skill is step 1 of `docs/release-workflow.md`. Read that page first. It wins on any conflict.

The output is one artifact. This step changes no code.

## Steps

1. Get the version from Charli. If Charli did not name one, ask.
2. Read the repo and the live state that each concern touches.
3. Read the format source with the Artifact `read` action: https://claude.ai/artifact/Pgj6aMdVVFKq7myHSRisj5
4. Publish a new artifact with the same layout, the same tokens and the same question cards. Set the `<title>` to exactly `my-app v<version> plan`. List the milestones, and mark each one as UI design, DB design, both, or Not needed.
5. Give the page the `db` capability, so that answers save to the `decisions` collection.
6. Create or update `docs/releases/v<version>.md`. Add the link and set the status to `Planning`.
7. Add the same link to `docs/releases/index.md`.
8. Send Charli the link, then stop.

## Answers

Read answers with the ArtifactData `list` action on the `decisions` collection. Update the plan and publish to the same URL.

## Gate

Stay in this step until Charli confirms the plan in a message. Do not start the design until Charli asks for it. Use `release-design` for that step.
