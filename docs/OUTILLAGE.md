# Outillage

L'inventaire de tout ce qui automatise, vérifie ou protège le travail sur Flâne : garde-fous de Claude Code, compétences et agents, vérifications automatiques, réglages du dépôt, outils du produit. Chaque ligne dit **à quoi ça sert**, **où ça vit** et **où ça en est** : en place, prévu dans une tranche, ou idée au parking. Ce fichier est mis à jour par la tranche qui livre l'outil.

## Les principes

1. **La méthode est vérifiée par la machine, pas seulement par Claude.** Ce qui peut être contrôlé par un script l'est : format des commits, secrets, cases de « fini », journal à jour.
2. **Attraper tôt** : une erreur coûte des secondes dans un hook local, des minutes dans les vérifications automatiques, des heures après intégration.
3. **Zéro dépendance quand un script suffit.** Un fichier bash dans le dépôt vaut mieux qu'un paquet npm pour lancer deux commandes.
4. **Défense en profondeur** : hook local, vérification automatique, agent et relecture humaine se recouvrent volontairement.
5. **Chaque outil a une tranche propriétaire**, qui le construit, le teste et met cette page à jour.

## Garde-fous de Claude Code (`.claude/`)

| Outil | Rôle | Où | État |
| --- | --- | --- | --- |
| Garde-fou `main` | Bloque commit, merge, rebase sur `main`, push vers `main`, push forcé | `.claude/hooks/garde-branche-main.sh` | En place. À affiner en T0.1 : lire la commande et non son contenu (faux positifs sur un texte contenant « git » et « commit ») |
| Fichiers interdits en lecture | Claude ne peut pas lire `.env`, keystores, clés, `google-services.json`, `node_modules` | `.claude/settings.json` (`deny`) | En place |
| Démarrage automatique | Au début de chaque session, injecte la dernière entrée du journal et la section « En cours » du backlog | hook `SessionStart` | Prévu T0.1 |
| Avertissement de fin de session | Quand Claude s'arrête, signale les modifications non enregistrées et la branche courante | hook `Stop` | Prévu T0.1 |
| Liste d'autorisations | Commandes sûres sans demande de permission : lecture seule git et gh, tests, lint, types. Les modifications de fichiers restent soumises à l'utilisateur | `.claude/settings.json` (`allow`) | Prévu T0.1 |
| Format et lint à l'écriture | Après chaque modification d'un fichier TypeScript, Prettier et ESLint sur ce fichier ; seules les erreurs remontent | hook `PostToolUse` | Prévu T0.3 (avec ESLint et Prettier) |
| Tests filtrés | Lance les tests et ne renvoie que les échecs, pour économiser le contexte | `tools/dev/test-summary.sh` | Prévu T0.2 |

## Compétences et agents (`.claude/`)

| Outil | Rôle | État |
| --- | --- | --- |
| `/installation` | Première installation : outils, dépôt git, dépôt GitHub | En place, utilisée le 2026-10-20 |
| `/debut`, `/fin` | Ouvrir et clore une session ; continuité par le journal | En place |
| `/tranche` | Fiche de tranche, avocat du diable, validation | En place |
| `/bilan-jalon` | Bilan produit et méthode, revue du parking | En place |
| `avocat-du-diable` | Attaque la fiche avant validation (Discuter) | En place |
| `auditeur-securite` | Audit indépendant selon la liste de `docs/SECURITE.md` (Sécuriser) | En place |
| `relecteur` | Relecture de code, conventions, tests (Sécuriser) | En place |

La mémoire persistante de Claude Code (hors dépôt) ne sert qu'aux préférences de travail de l'utilisateur. **Les documents du dépôt sont la seule source de vérité du projet.**

## Garde-fous git locaux (`.githooks/`)

Activés par `git config core.hooksPath .githooks`, sans dépendance. Prévus en T0.1 ; les vérifications qui demandent du code (types, lint) ne s'activent que lorsque `app/` existe (T0.3).

| Hook | Rôle | État |
| --- | --- | --- |
| `pre-commit` | Recherche de secrets (gitleaks) sur les fichiers indexés | Prévu T0.1 |
| `commit-msg` | Format Conventional Commits avec scope `Tx.y` ou `meta` | Prévu T0.1 |
| `pre-push` | Types, lint et tests rapides avant d'envoyer | Prévu T0.1, actif à partir de T0.3 |

## Vérifications automatiques (`.github/workflows/`)

Prévues en T0.2. Toutes les actions sont épinglées sur un commit précis, chaque workflow déclare des permissions minimales.

| Vérification | Rôle | État |
| --- | --- | --- |
| Types, lint, tests | TypeScript strict, ESLint, Prettier, tests unitaires | Prévu T0.2, actif à partir de T0.3 |
| Audit des dépendances | Failles connues (`npm audit` ou osv-scanner) et revue des dépendances ajoutées par la PR | Prévu T0.2 |
| Recherche de secrets | gitleaks sur l'historique de la branche | Prévu T0.2 |
| Licences | Toute dépendance sous licence compatible AGPL-3.0, sinon échec | Prévu T0.2 |
| Santé Expo | `expo-doctor` | Prévu T0.2, actif à partir de T0.3 |
| Méthode | La PR échoue si une case de « fini » n'est pas cochée, ou si du code a changé sans que `docs/JOURNAL.md` change | Prévu T0.2 |
| Exécution hebdomadaire | Audit des dépendances et recherche de secrets sur `main`, chaque semaine, même sans PR | Prévu T0.2 |
| Banc d'essai en PR | Le banc d'essai des suggestions tourne sur le trajet de référence et poste la différence avec `main` en commentaire | Parking, après T2.8 |

## Réglages du dépôt GitHub et du projet

| Réglage | Rôle | État |
| --- | --- | --- |
| Modèles d'issues et de PR | Le modèle de PR reprend la définition de « fini » en cases à cocher et renvoie à la fiche | Prévu T0.1 |
| Alertes de vulnérabilité et correctifs automatiques | GitHub signale et propose les correctifs de sécurité | Prévu T0.1 |
| Dependabot | Mises à jour groupées, une PR par semaine, soumises aux mêmes vérifications | Prévu T0.1 (actif à partir de T0.3) |
| Protection de `main` | Interdire le push direct, exiger les vérifications vertes. À tester sur le dépôt privé plutôt que supposer payant | Prévu T0.1 |
| `.npmrc` | `ignore-scripts=true` (aucun script d'installation tiers), `save-exact=true` | Prévu T0.1 |
| `.nvmrc` et `engines` | Version de Node fixée (LTS) | Prévu T0.1 |
| `.editorconfig` | Fins de ligne, indentation, encodage | Prévu T0.1 |
| `SECURITY.md` | Politique de signalement des failles | Parking, au passage en public (jalon 5) |

## Versions

| Outil | Rôle | État |
| --- | --- | --- |
| Historique des versions | Généré à partir des messages de commit conventionnels ; outil léger à choisir | Prévu T0.4 |
| Étiquette par jalon | `v0.0.1`, `v0.1.0`… (voir `docs/CONVENTIONS.md`) | Prévu T0.4 |

## Outils du produit

| Outil | Rôle | État |
| --- | --- | --- |
| Trajet de référence | Briançon–Embrun (connu par cœur) et Briançon–Marseille (long) : le même scénario pour toutes les tranches | Défini le 2026-10-20 ; banc d'essai en T2.8 |
| Visualiseur de lieux | Carte web du contenu d'un paquet régional | Prévu T1.6 |
| « Pourquoi ce lieu ? » | D'où vient une suggestion, quelle règle l'a fait monter | Prévu T1.6 |
| Vérificateur de paquets | Comptes par type et région, anomalies, signature | Prévu T1.5 |
| Banc d'essai des suggestions | Liste de ce que Flâne propose sur le trajet de référence, comparée d'une version à l'autre | Prévu T2.8 |
| Simulateur de trajet | Enregistrer un vrai trajet, le rejouer, en accéléré | Prévu T3.1 |
| Écouteur de phrases | Toutes les formulations dites par la voix, avec leur durée | Prévu T3.5 |
| Mesure de la batterie | Sur un trajet simulé | Prévu T3.6 |
| Carnet de route | Notes prises pendant un trajet test (`docs/carnet-de-route/`) | Modèle en place ; saisie dans l'appli en T4.3 |
| Tests de parcours (Maestro), galerie d'écrans (Storybook) | | Parking |
