---
name: bilan-jalon
description: Conduit le bilan de fin de jalon de Flâne (produit et méthode). À lancer quand toutes les tranches d'un jalon sont faites et que le trajet test a eu lieu.
disable-model-invocation: true
---

# Bilan de jalon

1. Vérifier que toutes les tranches du jalon sont « Faites » ou « À tester sur la route » dans `docs/BACKLOG.md`, et que le trajet test de fin de jalon a eu lieu. Sinon, le signaler.
2. **Le produit** : le critère d'usage du jalon est-il atteint ? Reprendre avec l'utilisateur les notes du carnet de route (`docs/carnet-de-route/`) et proposer pour chacune : tranche, parking ou abandon. Les tranches « À tester sur la route » passent en « Faite » si le trajet test les a validées.
3. **La méthode** : ce qui a bien marché, ce qui a frotté, ce qu'on ajuste. Suggérer à l'utilisateur de lancer `/insights` pour nourrir cette partie.
4. **Le parking** : passer en revue les idées, une par une. Pour chacune : tranche d'un prochain jalon, garder au parking, ou abandonner.
5. Proposer les tranches du jalon suivant, avec leur ordre, et la version à étiqueter (voir `docs/CONVENTIONS.md`).
6. Rédiger le bilan à partir de `docs/modeles/BILAN_JALON.md` et le **montrer dans la conversation**.
7. Avec l'accord de l'utilisateur seulement : enregistrer `docs/bilans/Jx-bilan.md`, et mettre à jour le backlog, la méthode et le journal, sur une branche `docs/meta-AAAA-MM-JJ`.
