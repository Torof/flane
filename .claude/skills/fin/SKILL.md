---
name: fin
description: Clôt une session de travail sur Flâne. À lancer en fin de session, avant un /clear ou une pause.
disable-model-invocation: true
---

# Clore une session Flâne

1. Faire le point avec l'utilisateur : ce qui a été fait, l'étape du cycle atteinte, ce qui reste.
2. Si une tranche arrive à l'étape Valider, dérouler la **définition de « fini »** de `docs/METHODE.md`, case par case. Une case non cochée bloque l'intégration : le dire clairement.
3. Préparer, sans l'enregistrer encore :
   - une entrée en haut de `docs/JOURNAL.md`, selon `docs/modeles/ENTREE_JOURNAL.md` (date, tranche, étape, fait, décisions, exceptions à la méthode avec leur raison, questions ouvertes, prochaine étape) ;
   - la mise à jour de `docs/BACKLOG.md` (statut de la tranche, nouvelles idées au parking) ;
   - si une décision structurante a été prise, une entrée dans `docs/DECISIONS.md` (modèle `docs/modeles/DECISION.md`).
4. Montrer ces modifications à l'utilisateur et attendre son accord.
5. Enregistrer au bon endroit :
   - pendant une tranche : sur la branche de la tranche (la documentation fait partie de la pull request) ;
   - hors tranche : sur une branche `docs/meta-AAAA-MM-JJ`, avec un commit `docs(meta): …`.
6. Proposer un `/clear` pour repartir à neuf à la prochaine session.
