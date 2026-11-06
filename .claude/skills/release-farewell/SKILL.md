---
name: release-farewell
description: Use when Charli says that a my-app release is done and asks for Farewell, the release notes, the tag or the GitHub release
---

# Release farewell

This skill is step 5 of `docs/release-workflow.md`. Read that page first. It wins on any conflict.

## Part 1: write the notes

1. Set the status to `Farewell` in `docs/releases/v<version>.md` and `docs/releases/index.md`.
2. Compare the handoff with the release branch. List what is done, what moved and what has no phone test result.
3. Read the format source with the Artifact `read` action: https://claude.ai/artifact/ChHjbRDoj3FuWZdXXoVi74
4. Publish a new artifact with that layout. Set the `<title>` to exactly `my-app v<version> release notes`.
5. Write the same notes as markdown under "Release notes" in the release record. Keep the sections from `docs/releases/v1.2.2.md`, and keep "Not tested yet" when any test has no result.
6. Move the `Unreleased` lines in `CHANGELOG.md` to a new section for the version. Follow the rules at the top of that page.
7. Link the artifact in the record and the index. Set the status to `Released`, and fill in the date and the GitHub release link.
8. Commit on the release branch when Charli asks, and wait for CI.
9. Send Charli the link, then stop.

## Gate

Ask Charli to confirm the notes. Name the three actions that the confirmation allows: the merge, the tag and the GitHub release. Do not do Part 2 before Charli confirms.

## Part 2: release

1. Merge the release PR into `main`.
2. Create and push the `v<version>` tag on the merge commit.
3. Save the notes in the scratchpad folder. Run `gh release create v<version> --target <merge-commit> --title v<version> --notes-file <notes-file>`.
4. Run `gh release view v<version> --json assets --jq '.assets | length'`. It must print `0`.

Never use `--attach`, and never pass a file to `gh release create` after the tag. GitHub adds the source code archives. The APK stays in expo.dev.

Report the release link and each item in "Not tested yet".
