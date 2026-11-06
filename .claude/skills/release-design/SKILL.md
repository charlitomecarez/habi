---
name: release-design
description: Use when Charli confirms a my-app plan and asks for the design, the UI design or the DB design of a release, or asks for a revision of a design artifact
---

# Release design

This skill is step 2 of `docs/release-workflow.md`. Read that page first. It wins on any conflict.

The output is one artifact. This step changes no code. Do not add a migration file, and do not touch the live database.

## Steps

1. Read the plan artifact for the version and each answer in its `decisions` collection.
2. If a plan question has no answer, ask Charli before you continue.
3. Read `docs/design-system.md`, `docs/database.md` and the code that each milestone touches.
4. Give each milestone in the plan a UI design, a DB design, both, or "Not needed" with the reason. If no milestone needs a design, ask Charli to skip this step.
5. For each new screen or flow, run `/impeccable shape <feature>`.
6. Write the design page in the scratchpad folder. "Step 2: Design" in the workflow lists what the UI design and the DB design hold.
7. Do the design checks. Fix each real finding.
8. Read the format source with the Artifact `read` action: https://claude.ai/artifact/Pgj6aMdVVFKq7myHSRisj5
9. Publish a new artifact with the same layout and the same tokens. Set the `<title>` to exactly `my-app v<version> design`.
10. Give the page the `db` capability, so that revision requests save to the `revisions` collection.
11. Link the artifact in `docs/releases/v<version>.md` and `docs/releases/index.md`. Set the status to `Design`.
12. Send Charli the link, then stop.

## Design checks

- **UI:** Run `/impeccable audit <target>` and `/impeccable critique <target>`. The `<target>` is the design page file. The rules in `ui-check` apply.
- **DB:** Compare the DB design with the checks in `.claude/agents/migration-reviewer.md`.

Show the result of both checks on the page. If `/impeccable` is not available, stop and tell Charli. Never report a check that did not run.

## Revisions

Read requests in chat, and with the ArtifactData `list` action on the `revisions` collection. For each request:

1. Apply the request. Run a command that Charli names, for example `bolder`, `colorize` or a redesign.
2. Do the design checks again on the changed part.
3. Publish to the same URL.
4. Add a row to the Revisions list on the page: the number, the request, the change and the check result.

If a request breaks a project rule, name the rule. Wait for Charli to change the request or the rule. If a request changes the scope of a milestone, also update the plan.

## Gate

Stay in this step until Charli confirms the design in a message. A revision on the page does not open the gate. Do not write a handoff until Charli asks for it. Use `release-handoff` for that step.
