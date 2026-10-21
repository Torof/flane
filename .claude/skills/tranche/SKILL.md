---
name: tranche
description: Prepares the sheet of a Flâne slice (the « sheet » moment of the ritual). Use before building any change.
---

# Prepare a slice sheet

1. Check that no other slice is « En cours » in `docs/BACKLOG.md`. Otherwise, say so and stop.
2. Name the slice (`Tx.y` from the backlog), or propose one if the owner starts from an idea. Sort the idea out loud first: now, parking, or « I disagree, here is why ».
3. Ask the owner what only they can decide, one or two questions at a time.
4. Write the sheet **sized to the stakes**, in English, and show it in the conversation:
   - **short** (half a page: why, criterion, in, out, risks in one line, tests, budget) when the slice touches no data of `docs/DONNEES.md`, no new network, no Android permission, no Claude Code setting, no automatic check, workflow, hook or GitHub setting;
   - **full** (template `docs/modeles/FICHE_TRANCHE.md`) otherwise.
5. Run `avocat-du-diable` on it. Show the owner its **three best objections**, each with a proposed answer; put the answers kept into the sheet.
6. Wait for the owner's explicit yes. Write the date in the sheet (`docs/tranches/Tx.y-short-name.md`) and set the slice « En cours » in the backlog.
7. At the first commit: push the branch and open the pull request **as a draft** (`gh pr create --draft --body-file`, template `.github/PULL_REQUEST_TEMPLATE.md`) with the plan as checkboxes; then `node tools/dev/owner-signals.mjs --pr <n> --expect draft`.
