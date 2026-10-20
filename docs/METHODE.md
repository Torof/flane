# Méthode de construction

Une méthode pour construire à deux (l'utilisateur et Claude) : les forces de l'agilité, sans ses rituels d'équipe. Elle est **canon** : Claude la fait respecter, même quand on est tentés de la contourner.

## Les rôles

- **L'utilisateur** décide, valide et teste.
- **Claude** propose, code et contredit. Il fait respecter la méthode.
- **Les agents** vérifient avec un regard neuf : `avocat-du-diable` (fiches), `auditeur-securite` (sécurité), `relecteur` (code).

## Les unités de travail

- **La tranche** : une petite fonctionnalité complète et utilisable, finissable en **une à trois sessions**. Identifiant `Tx.y` (jalon x, tranche y). Chaque tranche a sa fiche dans `docs/tranches/`.
- **Le jalon** : un moment d'usage réel, avec un critère vérifiable. Pas une date. Il se termine par un trajet test, puis un bilan.
- **Le parking** : la liste des idées nouvelles, notées sans être traitées, revues en fin de jalon.

## Le cycle, pour chaque tranche

| Étape | Ce qu'on fait | Coché quand |
| --- | --- | --- |
| 1. Planifier | Fiche de tranche (`/tranche`) | La fiche est complète |
| 2. Discuter | On confronte la fiche ; `avocat-du-diable` l'attaque | Les objections ont une réponse |
| 3. Choisir | L'utilisateur valide explicitement | Date de validation dans la fiche |
| 4. Construire | Branche dédiée, petits morceaux, tests | Le code fait ce que dit la fiche, les tests passent |
| 5. Observer | L'utilisateur constate le résultat : sur son téléphone (simulateur, banc d'essai), ou, pour une tranche sans appli (jalon 0, données), en vérifiant lui-même le résultat (dépôt, visualiseur, rapport) | L'utilisateur confirme le comportement |
| 6. Sécuriser | `auditeur-securite` et `relecteur` ; vérifications automatiques | Aucun point bloquant ouvert |
| 7. Valider et consigner | Définition de « fini », intégration, documentation | Toutes les cases de « fini » cochées |

Une étape n'est jamais commencée avant que la précédente soit cochée.

## La définition de « fini »

Une tranche est finie quand **toutes** ces cases sont cochées :

- [ ] Le critère de réussite de la fiche est atteint et l'utilisateur l'a constaté.
- [ ] Les tests sont écrits et passent, y compris les cas limites de la fiche.
- [ ] Les vérifications automatiques sont vertes (tests, types, dépendances, secrets, licences).
- [ ] L'audit de sécurité n'a laissé aucun point bloquant ouvert.
- [ ] La relecture de code n'a laissé aucun point bloquant ouvert.
- [ ] `docs/DONNEES.md` est à jour si la tranche touche des données.
- [ ] Le glossaire est à jour si la tranche introduit un nouveau terme.
- [ ] Les décisions structurantes sont consignées dans `docs/DECISIONS.md`.
- [ ] Le journal et le backlog sont à jour, **dans la pull request de la tranche**.
- [ ] La branche est intégrée à `main` par cette pull request (en dernier).

## Le tableau des tranches

| Statut | Quand |
| --- | --- |
| Idée | La tranche est listée, sans fiche validée |
| Prête | La fiche est validée (étape Choisir) |
| En cours | La construction a commencé |
| À tester sur la route | La tranche est intégrée, mais son effet en route n'a pas encore été vérifié sur un vrai trajet (trajet test du jalon) |
| Faite | Intégrée et, si elle touche la route, validée sur un vrai trajet |

**Une seule tranche « En cours » à la fois.** Le tableau vit dans `docs/BACKLOG.md`, puis dans GitHub Projects une fois mis en place.

## Le budget

Chaque tranche reçoit un budget en sessions, fixé à l'étape Planifier. Budget dépassé : on s'arrête et on en discute. On **réduit le contenu** plutôt que d'allonger le temps ; le reste devient une autre tranche.

## Les rituels

- **Début de session** — `/debut` : lire le journal, annoncer jalon, tranche, étape et prochaine action.
- **Fin de session** — `/fin` : définition de « fini » si besoin, journal, backlog, puis `/clear`.
- **Fin de jalon** — trajet test réel, carnet de route, puis `/bilan-jalon` : bilan produit, bilan de méthode (avec `/insights`), revue du parking, version étiquetée.

## Les exceptions

L'utilisateur reste le décideur. Une étape peut être sautée, mais **jamais en silence** : Claude signale le saut, on en discute, et l'exception est consignée dans le journal avec sa raison.

## Les modèles de Claude, selon la tâche

- **Opus** : planifier, discuter l'architecture, auditer la sécurité, avocat du diable.
- **Sonnet** : construire, relire, tester.
- Les sous-agents peuvent tourner sur un modèle plus léger pour les tâches simples et verbeuses.

## Économiser le contexte, sans perdre en qualité

- Une session ne traite qu'une seule tranche ; `/clear` entre deux sessions ou après une pause de plus d'une heure. Le journal assure la continuité.
- Rester en mode par défaut ou en mode plan : jamais d'acceptation automatique des modifications.
- `CLAUDE.md` reste court (moins de 200 lignes). Les procédures détaillées vivent dans les compétences (`.claude/skills/`) et ne se chargent qu'à la demande.
- Les sorties verbeuses (tests, journaux) passent par des sous-agents ou des filtres (hooks) qui ne remontent que l'essentiel.
- Le mode plan pour toute tâche complexe : Claude explore et propose avant de modifier.
- Corriger tôt : Échap pour interrompre, `/rewind` pour revenir en arrière.
- Demandes précises : un fichier, une fonction, un objectif.

## Les outils de développement

À construire dans les premières tranches, car le reste s'appuie dessus :

- **Vérifications automatiques** (GitHub Actions) : tests, types, failles des dépendances, secrets, licences.
- **Simulateur de trajet** : rejouer un trajet enregistré, éventuellement en accéléré.
- **Trajet de référence** : le même scénario pour toutes les tranches.
- **Visualiseur de lieux** : une carte web du contenu d'un paquet régional.
- **« Pourquoi ce lieu ? »** : d'où vient une suggestion, quelle règle l'a fait monter.
- **Banc d'essai des suggestions** : la liste de ce que Flâne propose sur le trajet de référence, comparée d'une version à l'autre.
- **Vérificateur de paquets** : comptes par type et région, anomalies, signature.
- **Écouteur de phrases** : toutes les formulations dites par la synthèse vocale, avec leur durée.
- **Mesure de la batterie** pendant un trajet simulé.
- **Carnet de route** : les notes prises pendant un trajet test (`docs/carnet-de-route/`).
- Plus tard : tests de parcours complets (Maestro), galerie d'écrans (Storybook), carnet de route transcrit par Claude.
