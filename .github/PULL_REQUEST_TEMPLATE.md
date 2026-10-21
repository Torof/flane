<!--
Le corps de cette pull request appartient à Claude : il est réécrit à chaque push.
L'utilisateur s'exprime en commentaires. Pour arrêter : fermer la pull request,
la repasser en brouillon, ou commenter « veto » ou « stop » (docs/METHODE.md).
-->
> **Ne fusionnez pas encore** : construction en cours (retiré quand l'audit est fini et la porte Observer passée).

## Tranche

- **Identifiant** : Tx.y
- **Fiche** : `docs/tranches/Tx.y-nom-court.md`
- **Résumé** : ce que l'utilisateur peut faire de plus, en une phrase.

## Plan (coché au fil de l'eau)

- [ ] Morceau 1
- [ ] Audit de sécurité et relecture, corrections
- [ ] Journal, backlog, issue « État » à jour

## Remarqué en route

Trois points au plus par source (Claude, chaque agent), une phrase chacun, étiquetés *problème*, *réussite* ou *idée*. Une remarque de sécurité ne donne aucun détail d'exploitation et renvoie à une tranche `fix/`.

- *idée* — …

## Définition de « fini »

- [ ] Critère de réussite atteint et constaté par l'utilisateur
- [ ] Tests écrits et verts, cas limites compris
- [ ] Vérifications automatiques vertes
- [ ] Audit de sécurité : aucun point bloquant ouvert
- [ ] Relecture : aucun point bloquant ouvert
- [ ] `docs/DONNEES.md`, glossaire, décisions à jour si nécessaire
- [ ] Journal, backlog et issue « État » à jour, dans cette pull request

## Exceptions à la méthode

Aucune, ou : étape sautée, raison, accord de l'utilisateur (consigné dans le journal).
