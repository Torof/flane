---
name: fin
description: Closes a Flâne session with the ritual. Claude runs it itself when we stop (the owner says so, a long pause is coming, or the « time to stop » reflex was accepted).
---

# Close a Flâne session

1. **Collect** (without writing it by hand): `node tools/dev/owner-signals.mjs --pr <n>` on the pull request in progress, `gh run list --limit 3`, `gh pr list`, Dependabot alerts as in `debut`.
2. **Sort the « Noticed on the way » points** of the pull request: *idea* and *problem* go to the parking or to an open question; *success* stays in the pull request. A *problem* Claude suggests dropping is put to the owner.
3. **Take stock with the owner**, in a few lines: what was done, the moment reached, what is left; the new version if the app changed (number and name chosen together, D-029); what worked and what got stuck; one line on the method itself; the next step proposed; one step aside.
4. If a slice reaches its trial and the owner said it works, go through the definition of done of `docs/METHOD.md`. An unticked box blocks the merge: say it plainly.
5. Write, without asking:
   - an entry at the top of `docs/JOURNAL.md` (template `docs/modeles/ENTREE_JOURNAL.md`), including « What worked / what got stuck » and « Method »;
   - the update of `docs/BACKLOG.md` (slice status, new ideas in the parking);
   - a decision in `docs/DECISIONS.md` if one was taken.
6. Commit and push to the right place (read the stop signals before the commit and before the push): on the slice's branch during a slice; otherwise on a `docs/meta-YYYY-MM-DD` branch with its pull request, merged directly.
7. Tell the owner in two lines what was recorded. They may `/clear`; Claude opens again at the next message.
