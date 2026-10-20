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
| Garde-fou `main` | Analyse chaque commande Bash de Claude. Bloque : commit, merge, rebase, reset sur `main` ; push vers `main`, `--no-verify`, `-c core.hooksPath`, réécriture de références, écriture directe sur le dépôt par l'API GitHub, écriture par Bash dans les dossiers protégés. Demande (confirmation de l'utilisateur) : push forcé, commandes indirectes (`bash -c`, `eval`, substitution) avec git, `gh pr merge` (porte Intégrer), réglages du dépôt. En cas de doute, bloque. Toute panne du hook = blocage | `.claude/hooks/garde-branche-main.sh` (enveloppe) et `.py` (analyse) | En place, durci en T0.1. Testé par `tools/dev/test-hooks.sh` |
| Protection des garde-fous | `Write` et `Edit` sur `.claude/**`, `.githooks/**`, `.github/**`, `tools/dev/**`, `CLAUDE.md`, `.gitignore`, `.mcp.json` demandent l'accord de l'utilisateur ; `.git/**` aussi sous accord ; l'écriture par Bash vers ces chemins est bloquée ; un retour vers une branche ou un commit aux garde-fous différents est demandé. Limites connues du garde-fou : `docs/SECURITE.md` | `.claude/settings.json` (`ask`) et garde-fou | En place (T0.1, étendu T0.1b) |
| Fichiers interdits en lecture | Claude ne peut pas lire `.env`, keystores, clés, `google-services.json`, `node_modules` | `.claude/settings.json` (`deny`) | En place |
| Mode de travail | « accept edits » réglé par `defaultMode` : les fichiers du projet se modifient sans demande, sauf les dossiers et fichiers protégés (D-020) | `.claude/settings.json` | En place (T0.1b) |
| Liste d'autorisations | Commandes sans demande, listées une par une et figées dans le banc de tests : git et gh en lecture, `add`, `commit`, `push`, `switch`, `gh pr create`, scripts du projet. Chaque préfixe a ses dérivés dangereux testés ; le garde-fou garde la priorité | `.claude/settings.json` (`allow`) | En place (T0.1b) ; entrées `npm` en T0.3 |
| Démarrage automatique | Au début de chaque session, injecte la dernière entrée du journal, la section « En cours » du backlog, la branche, l'état de l'arbre et les issues ouvertes (numéro, titre nettoyé et tronqué, auteur, étiquettes ; jamais le corps ; dix au plus ; délai sur `gh` ; plafond en octets) | hook `SessionStart` | Prévu T0.1c |
| Avertissement de fin de session | Signaler les modifications non enregistrées | hook `Stop` | Retiré en T0.1 : ce hook se déclenche à chaque réponse, pas en fin de session. `/fin` et le démarrage automatique couvrent le besoin |
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

Activés par `tools/dev/setup.sh` (`git config core.hooksPath .githooks`), sans dépendance npm. En place depuis T0.1 ; les vérifications qui demandent du code (types, lint) ne s'activent que lorsque `app/` existe (T0.3). Règle commune : en cas de doute, on refuse.

| Outil | Rôle | État |
| --- | --- | --- |
| `pre-commit` | Recherche de secrets sur les fichiers indexés avec gitleaks 8.30.1 ; gitleaks absent ou en erreur = commit refusé ; le secret n'est jamais affiché | En place (T0.1) |
| `commit-msg` | Format Conventional Commits avec scope `Tx.y`, `Tx.yb` ou `meta`, marqueur `!` ; exceptions `Revert "…"` et fusions git et GitHub | En place (T0.1) |
| `pre-push` | Types, lint et tests avant d'envoyer, dès que `app/package.json` existe | En place (T0.1), actif à partir de T0.3 |
| `tools/dev/setup.sh` | Active les hooks, installe gitleaks (version épinglée, SHA-256 vérifié, Linux x86_64) dans `~/.local/bin`, affiche l'état. À lancer après chaque clonage | En place (T0.1) |
| `tools/dev/test-hooks.sh` | Banc de tests des hooks git, des réglages de Claude Code et du garde-fou de Claude, dans des dépôts temporaires : une ligne par cas, sortie 1 si un échec | En place (T0.1) |
| Mise à jour de gitleaks | Manuelle : changer la version et la somme de contrôle dans `setup.sh`, relancer le banc | Revue au bilan de chaque jalon |

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
| Vérifications exigées | La règle GitHub sur `main` exige les vérifications vertes avant fusion | Prévu T0.2 |
| CodeQL | Analyse de code GitHub, gratuite sur dépôt public | Prévu T0.2 ou T0.3, quand il y a du code |
| Exécution hebdomadaire | Audit des dépendances et recherche de secrets sur `main`, chaque semaine, même sans PR | Prévu T0.2 |
| Banc d'essai en PR | Le banc d'essai des suggestions tourne sur le trajet de référence et poste la différence avec `main` en commentaire | Parking, après T2.8 |

## Réglages du dépôt GitHub et du projet

| Réglage | Rôle | État |
| --- | --- | --- |
| Dépôt public, licence AGPL-3.0 | `LICENSE`, section « Licence » du `README.md`, notice SPDX dans le code dès T0.3 (D-019) | En place (T0.1) |
| Modèles d'issues et de PR | Le modèle de PR reprend la définition de « fini » en cases à cocher et renvoie à la fiche ; deux modèles d'issues (bug sur la route, idée), sans issue vierge, qui n'invitent à aucune position | En place (T0.1) |
| Règle GitHub sur `main` | Pas de push direct, pas de push forcé, pas de suppression ; aucun contournement. Refusée sur le dépôt privé gratuit, obtenue par le passage en public | En place (T0.1) ; vérifications exigées en T0.2 |
| Recherche de secrets GitHub | Alertes et blocage des push contenant un secret, côté serveur | En place (T0.1) |
| Alertes de vulnérabilité et correctifs automatiques | GitHub signale et propose les correctifs de sécurité | En place (T0.1) |
| Fusion par merge uniquement, branche supprimée après fusion, projets désactivés | D-017, D-018 | En place (T0.1) |
| Dependabot | Mises à jour groupées, une PR par semaine, soumises aux mêmes vérifications | Prévu T0.2 (`github-actions`), T0.3 (`npm`) |
| `.npmrc` | `ignore-scripts=true` (aucun script d'installation tiers), `save-exact=true` | Prévu T0.3 |
| `.nvmrc` et `engines` | Version de Node fixée, selon le SDK Expo | Prévu T0.3 |
| `.editorconfig` | Fins de ligne, indentation, encodage | En place (T0.1) |
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
