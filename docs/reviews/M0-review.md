# Milestone 0 review — The workshop is ready

**Date**: 2026-10-21 · **Status**: in progress (point 5 waits for the design brainstorm). No test trip: milestone 0 has no road feature.

## 1. Product

Criterion « a change automatically goes through all the checks, and an empty Flâne app installs on the owner's phone »: **met**. Four required checks on every pull request (red proven on #12 and #19, merge blocked); the test APK is on the owner's phone and receives instant updates (confirmed by the owner).

## 2. Method

Kept: the ritual and its reflexes, one line per piece built, stop-and-options when outside the sheet, sheets sized to the stakes, the three best objections, the security pass on every slice (it found a real hole in almost every tooling slice), parallel agents for mechanical work.

Changed:
- **Tooling is never decided alone**: Claude asks the owner whether it is needed now; together we choose now or the parking (owner's wording, stronger than Claude's proposal).
- **The owner's hands in one moment**: settings to commit, trials, veto test gathered, never scattered.
- **The real veto test** is done at the first pull request of milestone 1, no more postponing.

## 3. Full security pass

Nothing blocking: no secret in 100 commits, no data flow outside `docs/DATA.md`, GitHub settings as expected, only the owner has access. Fixed in `docs/SECURITY.md`: Expo two-factor authentication is not yet enabled (accepted risk, T2.0); `allowBackup` does not stop device-to-device transfer (fix before the first stored data, T2.0); merges through `gh api graphql` are not caught by the stop gate and the `gh` token is broad (T2.0); development tooling is outside `deps-check`. Owner's moment at the first milestone-1 pull request: `rm -Rf` asks, `credentials.json` unreadable. For milestone 1: the data pipeline needs checks before its first dependency; open data is untrusted input; pack signing relies on update signing on the test variant.

## 4. Parking

Kept as is: stage 2 and « later » ideas. Arriving with a product slice: dark mode, English in the app, final icon, links, debug-log decision, the `DONNEES.md` comment, moving tool tests, test bench in PRs, a root `SECURITY.md`. Dropped: dashboard and email notifications, commit format checked on GitHub, approving sheets in batch. Tooling, to ask the owner when needed: Claude without a session, a version check on the built app, dead-reference and leftover-French checks, observing the agents (at the milestone 1 review), local builds, secret-scanning check, production-build guard.

## 5. Milestone 1

Not decided yet. The owner asked to talk about interface and design first: brainstorm of 2026-10-21, `docs/vision-draft-2026-10-21.md` and the mockups. To finish together before choosing milestone 1's slices and their order.
