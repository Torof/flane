---
name: tranche
description: Prépare la fiche d'une tranche de Flâne (étape Planifier du cycle). À utiliser avant de construire toute fonctionnalité.
---

# Préparer une fiche de tranche

1. Vérifier qu'aucune autre tranche n'est « En cours » dans `docs/BACKLOG.md`. Sinon, le signaler et s'arrêter.
2. Identifier la tranche (identifiant `Tx.y` du backlog), ou en proposer une si l'utilisateur part d'une idée.
3. Avant de rédiger, poser à l'utilisateur les questions nécessaires, une ou deux à la fois. Ne pas deviner ce qui relève de sa décision.
4. Rédiger la fiche à partir de `docs/modeles/FICHE_TRANCHE.md` et la **montrer dans la conversation**. Remplir en particulier : critère de réussite, dedans et dehors, budget en sessions, risques de sécurité, données touchées (renvoyer à `docs/DONNEES.md`), plan de tests. Ne l'enregistrer dans `docs/tranches/Tx.y-nom-court.md` qu'avec l'accord de l'utilisateur.
5. Étape Discuter : lancer l'agent `avocat-du-diable` sur la fiche. Présenter ses objections à l'utilisateur, avec une proposition de réponse pour chacune ; reporter les réponses retenues dans la fiche.
6. Étape Choisir : attendre la validation explicite de l'utilisateur. Consigner la date de validation dans la fiche, et passer la tranche en « Prête » dans le backlog. Elle passe « En cours » au premier jour de construction.
7. Au premier commit de la construction : pousser la branche et ouvrir la pull request **en brouillon** (`gh pr create --draft --body-file`), selon `.github/PULL_REQUEST_TEMPLATE.md`, avec le plan en cases ; puis `node tools/dev/owner-signals.mjs --pr <n> --expect draft`. Mettre à jour l'issue « État de Flâne ».
