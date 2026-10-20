# Tx.y — Nom de la tranche

**Jalon** : Jx — …
**Étape du cycle** : Planifier | Discuter | Choisir | Construire | Observer | Sécuriser | Valider
**Statut dans le backlog** : Idée | Prête | En cours | À tester sur la route | Faite
**Budget** : … session(s)
**Branche** : `feat/Tx.y-nom-court` (ou `fix/`, `chore/` selon la nature de la tranche)
**Validée le** : (date, à l'étape Choisir)

## Objectif

Une ou deux phrases : ce que l'utilisateur pourra faire à la fin.

## Critère de réussite

Comment on saura, concrètement, que c'est réussi. Vérifiable par l'utilisateur.

## Dedans

- …

## Dehors

- … (et où ça ira : autre tranche, parking)

## Approche

Les grandes lignes techniques. Les fichiers ou dossiers concernés.

## Dépendances ajoutées

| Bibliothèque | Pourquoi | Alternatives | Licence | Maintenance |
| --- | --- | --- | --- | --- |
| — | | | | |

## Données touchées

Quelles données, où elles vivent, si elles quittent le téléphone. Mettre à jour `docs/DONNEES.md`.

## Risques de sécurité

Les risques propres à cette tranche, et leur parade. Renvoyer à `docs/SECURITE.md`.

## Plan de tests

- Cas nominal : …
- Cas limites : pas de réseau, aucun lieu trouvé, permission refusée, données invalides, batterie faible…
- Test sur le téléphone : …

## Prévoir sans construire

Ce que cette tranche prépare pour la suite (partage, avis, iOS), sans le développer.

## Trous fréquents

À passer en revue avant l'étape Discuter. Pour chaque point : traité dans la fiche, non concerné, ou renvoyé à une autre tranche.

- [ ] Sans réseau, sans lieu trouvé, permission refusée, données invalides : comportement défini
- [ ] Textes affichés : tous dans les fichiers de traduction
- [ ] Données touchées : listées, avec ce qui quitte le téléphone (`docs/DONNEES.md`)
- [ ] Nouveaux termes : dans le glossaire, et dans les noms du code
- [ ] Nouvelles dépendances : justifiées, licence vérifiée
- [ ] Nouvelles permissions Android : nécessaires et justifiées
- [ ] Mises à jour instantanées : la tranche franchit-elle le déclencheur de signature (permission sensible, donnée personnelle stockée, second appareil ou canal) ? Si oui, la signature vient d'abord (`docs/SECURITE.md`)
- [ ] Ce que la tranche laisse en place pour la suite (identifiants stables, actions, affichage séparé)
- [ ] Ce que l'utilisateur devra constater à l'étape Observer, et comment

## Objections de l'avocat du diable

(Collées après l'étape Discuter, avec la réponse retenue pour chacune.)

## Définition de « fini »

- [ ] Critère de réussite atteint et constaté par l'utilisateur
- [ ] Tests écrits et verts, cas limites compris
- [ ] Vérifications automatiques vertes
- [ ] Audit de sécurité : aucun point bloquant ouvert
- [ ] Relecture : aucun point bloquant ouvert
- [ ] `DONNEES.md`, glossaire, décisions à jour si nécessaire
- [ ] Version montée dans `app/package.json` (une par tranche, voir `docs/CONVENTIONS.md`) ; nouvel APK si la version native change
- [ ] Journal et backlog à jour
- [ ] Intégrée à `main` par pull request
