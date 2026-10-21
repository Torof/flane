---
name: fin
description: Clôt une session de travail sur Flâne. À lancer en fin de session, avant un /clear ou une pause.
disable-model-invocation: true
---

# Clore une session Flâne

1. **Collecte** (sans la rédiger à la main) : `node tools/dev/owner-signals.mjs --pr <n> --issue 16` (pull request en cours et issue « État de Flâne »), `gh run list --limit 3`, `gh pr list`, alertes Dependabot comme dans `/debut`. Si le jeton `gh` ne lit pas les alertes, le dire dans l'issue.
2. **Tri des remarques** de la rubrique « Remarqué en route » de la pull request : *idée* et *problème* vont au parking ou en question ouverte ; *réussite* reste dans la pull request. Un *problème* que Claude propose d'écarter reste dans « Remarques ouvertes » de l'issue « État » jusqu'à l'accord ou au veto de l'utilisateur.
3. Faire le point avec l'utilisateur : ce qui a été fait, l'étape du cycle atteinte, ce qui reste.
4. Si une tranche arrive à l'étape Valider, dérouler la **définition de « fini »** de `docs/METHODE.md`, case par case. Une case non cochée bloque l'intégration : le dire clairement.
5. Écrire directement, sans demander d'accord :
   - une entrée en haut de `docs/JOURNAL.md`, selon `docs/modeles/ENTREE_JOURNAL.md` (date, tranche, étape, fait, décisions, exceptions à la méthode avec leur raison, questions ouvertes, prochaine étape) ;
   - la mise à jour de `docs/BACKLOG.md` (statut de la tranche, nouvelles idées au parking) ;
   - si une décision structurante a été prise, une entrée dans `docs/DECISIONS.md` (modèle `docs/modeles/DECISION.md`).
6. Enregistrer et pousser (point de contrôle avant le commit et avant le push) au bon endroit :
   - pendant une tranche : sur la branche de la tranche (la documentation fait partie de la pull request) ;
   - hors tranche : sur une branche `docs/meta-AAAA-MM-JJ`, avec un commit `docs(meta): …` et une pull request.
7. Réécrire le corps de l'issue « État de Flâne » selon `docs/modeles/ETAT.md` (« Claude ne travaille pas en ce moment »), avec `gh issue edit 16 --body-file`.
8. Résumer à l'utilisateur en cinq lignes ce qui a été consigné, puis proposer un `/clear` pour repartir à neuf à la prochaine session.
