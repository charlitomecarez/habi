# Release workflow

Every release has five steps: Planning, Design, Handoff, Development and Farewell. This workflow starts with v1.3.0.

## The five steps

| Step           | Started by                                | Output                                                           | Gate                                     |
| -------------- | ----------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| 1. Planning    | Charli gives concerns and asks for a plan | The plan artifact                                                | Charli confirms the plan                 |
| 2. Design      | Charli asks for the design                | The design artifact, with the UI and DB design of each milestone | Charli confirms the design               |
| 3. Handoff     | Charli asks for the handoff               | The handoff artifact, with milestones                            | Charli confirms the handoff              |
| 4. Development | Charli asks to start development          | Code, tests, checks, CI, and phone tests on the Galaxy A56       | Charli confirms that development is done |
| 5. Farewell    | Charli asks to start Farewell             | The release notes artifact, the tag and the GitHub release       | Charli confirms the release notes        |

## Gates

- Charli gates each step. Claude stops at the end of each step and waits.
- A gate opens only when Charli confirms in a message. An answer on an artifact page is not a gate.
- Claude does not start the next step until Charli asks for it.
- If Charli asks for changes, Claude stays in the same step.

## Names

Use the release version in every name, so that each item is easy to find.

| Item                   | Name                            |
| ---------------------- | ------------------------------- |
| Plan artifact          | `Habi v<version> plan`          |
| Design artifact        | `Habi v<version> design`        |
| Handoff artifact       | `Habi v<version> handoff`       |
| Release notes artifact | `Habi v<version> release notes` |
| Release branch         | `r/v<version>`                  |
| Milestone branch       | `feat/<name>` or `fix/<name>`   |
| Release record         | `docs/releases/v<version>.md`   |
| Changelog              | `CHANGELOG.md`                  |
| Tag and GitHub release | `v<version>`                    |

## Docs during each step

Keep the release record current in each step. Do not wait for the end of the release.

1. Start `docs/releases/v<version>.md` when Planning starts.
2. Add a row for the release to [releases/index.md](releases/index.md).
3. After you publish an artifact, add its link to the record and to the index at once.
4. Change the status in both files when a step changes.

The status values are `Planning`, `Design`, `Handoff`, `Development`, `Farewell` and `Released`. Commit these changes on the release branch when Charli asks.

Keep names, account numbers, keys and real statement rows out of the artifacts and the docs.

## Step 1: Planning

1. Charli gives the concerns for the release.
2. Claude reads the repo and the live state that the concerns touch.
3. Claude publishes the plan artifact in the current plan format. The [v1.2.2 plan](https://claude.ai/artifact/Pgj6aMdVVFKq7myHSRisj5) shows that format. The plan lists the milestones, and marks each one as UI design, DB design, both, or Not needed.
4. Charli answers the questions on the page or in chat.
5. Claude updates the plan until Charli confirms it.

The plan changes no code.

## Step 2: Design

The design shows how each milestone looks and how it stores data, before anybody writes code. The step covers UI design and DB design.

The design covers every milestone in the plan:

- A milestone needs UI design if it adds or changes a screen, a component, a flow or UI copy.
- A milestone needs DB design if it adds or changes a table, a column, a view, a trigger, a policy or a storage bucket.
- A milestone is "Not needed" if it changes neither, or if the change is too small to need a design. The design gives the reason.

If no milestone needs a design, Claude asks Charli to skip this step. If Charli agrees, Claude writes "Not needed" in the record and the index.

1. Claude reads the confirmed plan and each answer.
2. Claude reads `docs/design-system.md`, `docs/database.md` and the code that each milestone touches.
3. For each new screen or flow, Claude runs `/impeccable shape <feature>`.
4. Claude writes the UI design and the DB design.
5. Claude does the design checks and fixes each real finding.
6. Claude publishes the design artifact.
7. Charli reviews the design and asks for revisions.
8. Charli confirms the design.

The design changes no code. No migration file goes into the repo, and nothing goes to the live database.

### UI design

For each milestone with UI design, the artifact shows:

- Each new or changed screen as a mock at phone width, in the light and dark themes.
- The empty, loading, error and filled states of each screen.
- The flow between the screens, and the one primary action of each screen.
- The UI copy.
- The tokens and the shared components that each screen uses. A new token or component needs a reason.

### DB design

For each milestone with DB design, the artifact shows:

- Each new or changed table, with its columns, types, defaults, constraints and indexes.
- The RLS and the ownership: `apply_owner_rls`, the policies of each shared table, and the owner trigger of each child table.
- Each new or changed view, trigger, function and storage bucket.
- Each row that the milestone writes to `public.reminders`.
- The effect on existing rows and on the installed APK. Name each destructive change.
- The draft SQL. The migration file comes in Development.

### Design checks

- **UI:** Run `/impeccable audit` and `/impeccable critique` on the design page. The rules in the `ui-check` skill apply. `CLAUDE.md` and `docs/design-system.md` win over an Impeccable suggestion.
- **DB:** Compare the DB design with the checks in `.claude/agents/migration-reviewer.md`.

The artifact shows the result of both checks: what Claude fixed and what Claude kept.

### Revisions

Charli can ask for a revision of any part of the design, for any reason, and as often as Charli wants. Each revision has these steps:

1. Charli gives the request in chat or on the artifact page.
2. Claude applies the request. Charli can name an Impeccable command, for example `bolder`, `colorize` or a redesign.
3. Claude does the design checks again on the changed part.
4. Claude publishes to the same URL.
5. Claude adds a row to the Revisions list on the page: the number, the request, the change and the check result.

These rules apply to each revision:

- If a request breaks a project rule, Claude names the rule. Claude then waits for Charli to change the request or the rule.
- If a request changes the scope of a milestone, Claude also updates the plan.
- A revision on the page does not open the gate. Only a message from Charli confirms the design.

After Charli confirms the design, Handoff and Development follow it. If later work must change the design, Claude asks Charli first. Claude then adds a revision to the same artifact.

## Step 3: Handoff

The handoff is for a developer. It turns the confirmed plan and the confirmed design into work that a person can start with no other context.

1. Claude reads the confirmed plan, the confirmed design and each answer.
2. Claude checks the repo again, because the plan can be out of date.
3. Claude publishes the handoff artifact.
4. Charli confirms the handoff.

Each milestone in the handoff has these parts:

- A number and a title.
- A label for the type: Setup, Feature, Fix, Docs or Release.
- A label for the difficulty: Easy, Medium or Hard.
- A label for each special need: Migration, New APK or Blocked.
- The branch name, the work, and a "Done when" list.
- The part of the design that the milestone builds, or "Not needed".

The [v1.2.0 handoff](https://claude.ai/artifact/UFZThwwvdcztdnyvFiWHB7) shows the current handoff format.

## Step 4: Development

The branch workflow does not change.

1. Cut `r/v<version>` from `main`.
2. For each milestone, cut a branch from the release branch.
3. Write the code and the tests. Follow the confirmed design. Update the docs in the same change, and add each change to `Unreleased` in [CHANGELOG.md](../CHANGELOG.md).
4. For a UI change, do the [Impeccable check](design-system.md#impeccable-check).
5. Run `npm run typecheck`, `npm run lint` and `npm test`, one at a time.
6. Open a PR into the release branch. CI must pass.
7. After the last milestone, set the version in `app.json`, `package.json` and `package-lock.json`.
8. Open the release PR from the release branch into `main`. Do not merge it yet.
9. Charli starts a build with Build from GitHub in expo.dev.
10. Charli tests the APK on the Galaxy A56.
11. Claude fixes each problem on the release branch.
12. Charli confirms that development is done.

Only Charli does the phone tests. Claude lists each phone test as "Not tested" until Charli gives the result.

## Step 5: Farewell

Claude does the docs before the merge, so that one PR holds the full record.

1. Claude compares the handoff with the merged work. Claude lists what is done, what moved and what is not tested.
2. Claude publishes the release notes artifact. The [v1.1.0 release notes](https://claude.ai/artifact/ChHjbRDoj3FuWZdXXoVi74) show the format.
3. Claude copies the notes into the release record and links the artifact.
4. Claude moves the `Unreleased` lines in [CHANGELOG.md](../CHANGELOG.md) to a new section for the version.
5. Claude sets the status to `Released` in the record and in the index.
6. Claude commits the docs on the release branch and waits for CI.
7. Charli confirms the release notes. This confirmation allows steps 8 to 10.
8. Claude merges the release PR into `main`.
9. Claude creates the `v<version>` tag on the merge commit.
10. Claude creates the GitHub release with the notes.
11. Claude checks that the release has no attached files.

A GitHub release holds only the source code archives, which GitHub adds. Never attach the APK. The APK stays in expo.dev.

```sh
gh release create v<version> --target <merge-commit> --title v<version> --notes-file <notes-file>
gh release view v<version> --json assets --jq '.assets | length'
```

The second command must print `0`.

## Skills

Project skills in `.claude/skills/` hold the steps for Claude. Charli can type each one as a command.

| Step        | Skill                  |
| ----------- | ---------------------- |
| Planning    | `/release-plan`        |
| Design      | `/release-design`      |
| Handoff     | `/release-handoff`     |
| Development | `/release-development` |
| Farewell    | `/release-farewell`    |
