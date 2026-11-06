# Release workflow

Every release has four steps: Planning, Handoff, Development and Farewell. This workflow starts with v1.3.0.

## The four steps

| Step           | Started by                                | Output                                                     | Gate                                     |
| -------------- | ----------------------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| 1. Planning    | Charli gives concerns and asks for a plan | The plan artifact                                          | Charli confirms the plan                 |
| 2. Handoff     | Charli asks for the handoff               | The handoff artifact, with milestones                      | Charli confirms the handoff              |
| 3. Development | Charli asks to start development          | Code, tests, checks, CI, and phone tests on the Galaxy A56 | Charli confirms that development is done |
| 4. Farewell    | Charli asks to start Farewell             | The release notes artifact, the tag and the GitHub release | Charli confirms the release notes        |

## Gates

- Charli gates each step. Claude stops at the end of each step and waits.
- A gate opens only when Charli confirms in a message. An answer on an artifact page is not a gate.
- Claude does not start the next step until Charli asks for it.
- If Charli asks for changes, Claude stays in the same step.

## Names

Use the release version in every name, so that each item is easy to find.

| Item                   | Name                              |
| ---------------------- | --------------------------------- |
| Plan artifact          | `my-app v<version> plan`          |
| Handoff artifact       | `my-app v<version> handoff`       |
| Release notes artifact | `my-app v<version> release notes` |
| Release branch         | `r/v<version>`                    |
| Milestone branch       | `feat/<name>` or `fix/<name>`     |
| Release record         | `docs/releases/v<version>.md`     |
| Tag and GitHub release | `v<version>`                      |

## Docs during each step

Keep the release record current in each step. Do not wait for the end of the release.

1. Start `docs/releases/v<version>.md` when Planning starts.
2. Add a row for the release to [releases/index.md](releases/index.md).
3. After you publish an artifact, add its link to the record and to the index at once.
4. Change the status in both files when a step changes.

The status values are `Planning`, `Handoff`, `Development`, `Farewell` and `Released`. Commit these changes on the release branch when Charli asks.

Keep names, account numbers, keys and real statement rows out of the artifacts and the docs.

## Step 1: Planning

1. Charli gives the concerns for the release.
2. Claude reads the repo and the live state that the concerns touch.
3. Claude publishes the plan artifact in the current plan format. The [v1.2.2 plan](https://claude.ai/artifact/Pgj6aMdVVFKq7myHSRisj5) shows that format.
4. Charli answers the questions on the page or in chat.
5. Claude updates the plan until Charli confirms it.

The plan changes no code.

## Step 2: Handoff

The handoff is for a developer. It turns the confirmed plan into work that a person can start with no other context.

1. Claude reads the confirmed plan and each answer.
2. Claude checks the repo again, because the plan can be out of date.
3. Claude publishes the handoff artifact.
4. Charli confirms the handoff.

Each milestone in the handoff has these parts:

- A number and a title.
- A label for the type: Setup, Feature, Fix, Docs or Release.
- A label for the difficulty: Easy, Medium or Hard.
- A label for each special need: Migration, New APK or Blocked.
- The branch name, the work, and a "Done when" list.

The [v1.2.0 handoff](https://claude.ai/artifact/UFZThwwvdcztdnyvFiWHB7) shows the current handoff format.

## Step 3: Development

The branch workflow does not change.

1. Cut `r/v<version>` from `main`.
2. For each milestone, cut a branch from the release branch.
3. Write the code and the tests. Update the docs in the same change.
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

## Step 4: Farewell

Claude does the docs before the merge, so that one PR holds the full record.

1. Claude compares the handoff with the merged work. Claude lists what is done, what moved and what is not tested.
2. Claude publishes the release notes artifact. The [v1.1.0 release notes](https://claude.ai/artifact/ChHjbRDoj3FuWZdXXoVi74) show the format.
3. Claude copies the notes into the release record and links the artifact.
4. Claude sets the status to `Released` in the record and in the index.
5. Claude commits the docs on the release branch and waits for CI.
6. Charli confirms the release notes. This confirmation allows steps 7 to 9.
7. Claude merges the release PR into `main`.
8. Claude creates the `v<version>` tag on the merge commit.
9. Claude creates the GitHub release with the notes.
10. Claude checks that the release has no attached files.

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
| Handoff     | `/release-handoff`     |
| Development | `/release-development` |
| Farewell    | `/release-farewell`    |
