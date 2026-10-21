---
name: bilan-jalon
description: Runs the end-of-milestone review of Flâne (product and method). Claude proposes it when every slice of a milestone is done and the test trip has taken place.
---

# Milestone review

1. Check that every slice of the milestone is « Faite » or « À tester sur la route » in `docs/BACKLOG.md`, and that the end-of-milestone test trip happened. Otherwise, say so.
2. **The product**: is the milestone's criterion met? Go through the trip notes (`docs/carnet-de-route/`) with the owner and propose for each: slice, parking or drop. Slices « À tester sur la route » become « Faite » if the trip validated them.
3. **The method** (on trial, D-028): what worked, what got stuck, what we change, from the journal's « Method » lines. Suggest `/insights` to the owner.
4. **Full security pass** of the milestone (`auditeur-securite` on everything merged since the last review).
5. **The parking**: one idea at a time: slice of a next milestone, keep parked, or drop.
6. Propose the slices of the next milestone and their order.
7. Write the review from `docs/modeles/BILAN_JALON.md`, show it in the conversation, then record `docs/bilans/Mx-review.md` and update the backlog, the method and the journal on a `docs/meta-YYYY-MM-DD` branch.
