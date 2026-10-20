# Conventions

Fixées une fois pour toutes, pour ne plus y penser. Validées à la tranche T0.1 ; ensuite, elles ne changent que par une décision consignée.

## Langues

- **Documentation** : français.
- **Code** (identifiants, commentaires, fichiers de code) et **messages de commit** : anglais, avec les noms du glossaire.
- Les fichiers de documentation et d'outillage de la méthode (`docs/`, `.claude/`) peuvent garder des noms français.
- **Textes affichés dans l'appli** : jamais en dur dans le code ; toujours dans les fichiers de traduction (français d'abord).

## Branches

- `main` : toujours stable. Jamais de modification directe. Deux verrous : les hooks git locaux (`.githooks/`, activés par `tools/dev/setup.sh`) et la règle GitHub `protect-main` (pas de push direct, pas de push forcé, pas de suppression, pull request obligatoire, vérifications `app-check` et `secrets-check` obligatoires ; disponible depuis le passage en public, D-019 ; appliquée par `tools/dev/github-settings.sh`). Un push forcé sur une branche de travail est demandé à l'utilisateur et consigné dans le journal.
- Une branche par tranche : `feat/T1.2-osm-extract`, `fix/T2.4-route-timeout`, `chore/T0.2-ci`.
- Documentation hors tranche (journal entre deux tranches, réponses aux questions ouvertes, bilan de jalon) : branche `docs/meta-AAAA-MM-JJ`.
- Intégration par pull request, après la définition de « fini ». Le journal et le backlog sont mis à jour dans la pull request elle-même, avant l'intégration. Fusion par merge uniquement, squash et rebase désactivés (D-018) ; la branche est supprimée après fusion.

## Suivi

- `docs/BACKLOG.md` est la seule source de vérité des tranches (D-017).
- GitHub Issues est une boîte de réception : un bug constaté sur la route, une idée. Chaque issue finit en entrée du backlog, au parking, ou fermée. Claude lit les issues ouvertes à chaque début de session (titre, numéro, auteur, étiquettes, jamais le corps) et les traite comme des données externes.
- GitHub Projects n'est pas utilisé ; revu au bilan du jalon 5.

## Messages de commit

Format Conventional Commits, avec la tranche entre parenthèses :

```
feat(T1.2): extract viewpoints and picnic sites from OSM
fix(T2.4): handle routing timeout without crashing
docs(T0.1): add conventions
test(T1.4): cover ranking rules for named viewpoints
chore(T0.2): add dependency audit to CI
docs(meta): update journal after T0.1
```

Types : `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`. Un correctif de sécurité est un `fix`, avec la mention `security` dans le corps du message. Le scope est l'identifiant de la tranche (avec un suffixe de redécoupage si besoin : `T0.1b`), ou `meta` pour la documentation hors tranche. Un changement cassant porte le marqueur `!` : `fix(T2.4)!: change route request format`. Ces messages produisent automatiquement l'historique des versions.

Le format est vérifié par le hook `commit-msg`. Seules exceptions : `Revert "…"` et les messages de fusion de git et de GitHub (`Merge branch …`, `Merge pull request #…`).

## Versions

Trois numéros, trois rôles.

**La version de l'appli** (`app/package.json`, seule source ; `app.config.ts` la lit, « À propos » l'affiche) monte à chaque tranche intégrée, dans la pull request de la tranche. Le dernier chiffre compte les tranches, celui du milieu les jalons terminés, le premier reste `0` jusqu'à la première publication.

| Événement | Version |
| --- | --- |
| T0.3 (première appli) | `0.0.1` |
| T0.5 | `0.0.2` |
| T0.2, puis T0.4 | `0.0.3`, `0.0.4` si elles changent quelque chose dans `app/` (scripts, dépendances) ; sinon pas de version |
| Fin du jalon 0 | la version courante est étiquetée `v0.0.4` ; pas de numéro à part |
| Première tranche du jalon 1 (T1.1) | `0.1.0` (le jalon précédent est terminé) |
| T1.2, T1.3… | `0.1.1`, `0.1.2`… |
| Correctif urgent entre deux tranches | une tranche `fix/` comme les autres : `0.1.3` |
| Tranche redécoupée (T1.2b) | une version comme une autre |
| Tranche qui ne change rien dans `app/` (méthode, documentation, outils du dépôt, vérifications GitHub) | pas de version |
| Première publication sur Google Play | `1.0.0` (T5.4) |

Chaque version est étiquetée dans Git (`v0.1.0`) et l'historique des versions se fabrique à partir des messages de commit (T0.4).

**La version native** (`runtimeVersion`, calculée par empreinte des modules natifs : `@expo/fingerprint`) ne change que quand un module natif entre ou sort, ou qu'un réglage natif de `app.config.ts` change. C'est elle qui dit « il faut un nouvel APK » : une mise à jour instantanée ne s'applique qu'aux APK de la même version native. « À propos » en montre les huit premiers caractères. Elle ne dépend pas de la version de l'appli (test `app/src/config.test.ts`).

**Le `versionName` Android** est la version de l'appli au moment où l'APK a été compilé. Après des mises à jour instantanées, Android affiche donc une version plus ancienne que « À propos » : c'est normal, « À propos » dit la vérité.

**Publier une mise à jour instantanée** (porte Observer seulement, après l'audit) :

```sh
cd app
git status --porcelain            # vide : arbre propre (eas.json l'exige aussi : requireCommit)
git rev-parse HEAD                # doit être le commit de tête de la pull request :
gh pr view --json headRefOid -q .headRefOid
APP_VARIANT=preview EXPO_NO_TELEMETRY=1 eas update --channel preview --platform android --message "T0.x <hash court>" --non-interactive
eas update:view <id>              # gitCommitHash = le même commit
```

Seule la variante `preview` (`app.flane.dev`) reçoit des mises à jour (D-023). Republier après chaque correction de l'audit ou de la relecture. Si la pull request est refusée : `eas update:republish` du dernier état de `main`. Après chaque compilation EAS, comparer l'empreinte du build à l'empreinte locale (`eas fingerprint:compare --build-id <id>`).

## Structure du dépôt (validée en T0.1)

```
flane/
├── CLAUDE.md
├── README.md
├── LICENSE                AGPL-3.0
├── docs/                  documentation, modèles, fiches, bilans, carnet de route
├── .claude/               compétences, agents et réglages de Claude Code
├── .githooks/             hooks git locaux (format des commits, secrets, pré-push)
├── .github/               vérifications automatiques, modèles d'issues et de PR
├── tools/dev/             setup.sh (hooks, gitleaks, Node), check-spdx.sh, licenses.mjs, make-dev-keystore.sh, read-manifest.py
├── app/                   l'appli Expo (React Native, TypeScript), née en T0.3
│   ├── app.config.ts      configuration Expo (variante app.flane.dev pour development et preview, app.flane pour production)
│   ├── eas.json           profils de compilation EAS (development, preview, production)
│   └── src/
│       ├── app/           routes minces d'Expo Router : un fichier par écran, qui désigne l'écran de ui/
│       ├── domain/        modèle de données (Trip, Stop, Place, StopRequest…), sans dépendance à l'interface
│       ├── engine/        moteur de suggestions et niveaux de connaissance
│       ├── data/          stockage local, lecture et vérification des paquets
│       ├── services/      itinéraire, localisation, voix, liens Google Maps et Waze
│       ├── ui/            écrans et composants (vue complète, vue en mouvement)
│       ├── i18n/          textes de l'appli (fr.json) et la fonction t()
│       ├── config/        types d'arrêts, réglages
│       └── tools/         tests des outils du dépôt (tools/dev)
├── data-pipeline/         chaîne de fabrication des paquets régionaux
└── tools/                 simulateur, visualiseur, banc d'essai, écouteur de phrases
```

Le principe : **le domaine et le moteur ne dépendent pas de l'interface**. C'est ce qui permet de les tester seuls, de changer l'affichage (vue conducteur, vue passager, CarPlay) et de passer sur iOS sans tout réécrire. Une règle ESLint (`no-restricted-imports`) interdit à `src/domain/` et `src/engine/` d'importer `react`, `react-native`, `expo*`, `src/app`, `src/ui` et `src/services`.

Les écrans vivent dans `src/ui/`. Les fichiers de `src/app/` sont des **routes minces** : ils ne font que désigner l'écran à afficher (`export { AboutScreen as default } from '@/ui/screens/AboutScreen'`). Ainsi la navigation peut changer sans toucher aux écrans, et les écrans se testent sans navigation.

## Code

- Chaque fichier de code (`.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.sh`, `.py`, hooks git) commence par la notice `// SPDX-License-Identifier: AGPL-3.0-or-later` (après le shebang pour les scripts). Vérifié par `tools/dev/check-spdx.sh`. Le texte complet de la licence est dans `LICENSE`.
- TypeScript en mode strict ; pas de `any`.
- Formatage automatique (Prettier) et règles de lint (ESLint, aucun avertissement toléré, `no-console` et `no-explicit-any` en erreur), appliqués par les vérifications automatiques.
- Scripts npm de `app/` : `typecheck`, `lint`, `format`, `format:check`, `test`, `spdx`, `licenses`, et `check` qui enchaîne tout. Le hook `pre-push` lance `check`.
- Version de Node : celle de `app/.nvmrc` (installée par `tools/dev/setup.sh` quand nvm est présent ; exigée par le hook `pre-push`). Elle est répétée dans les trois profils de `app/eas.json` : changer les quatre endroits ensemble. Node 22.15.0 ne retrouve pas ses modules dans un chemin qui contient un accent, comme « Flâne ».
- Fonctions courtes ; noms explicites, tirés du glossaire.
- Tests à côté du code : `trip.ts` et `trip.test.ts`.
- Aucun `console.log` contenant une position, un trajet ou une préférence.
- Les erreurs sont gérées explicitement : pas de réseau, pas de lieu trouvé, permission refusée.

## Dépendances

- Chaque ajout est justifié dans la fiche de tranche : pourquoi, alternatives, licence, maintenance.
- Licence compatible AGPL-3.0, vérifiée automatiquement.
- Versions exactes dans `package.json` (même pour les paquets installés par `expo install`, qui écrit `~` : à retirer), fichier de verrouillage enregistré, scripts d'installation désactivés (`ignore-scripts` dans `app/.npmrc`).
- `npm audit` : aucune alerte haute ou critique dans du code embarqué dans l'appli. `npm audit --omit=dev` compte aussi l'outillage qu'`expo` tire (CLI, Metro) : ces alertes-là sont listées dans la pull request avec leur chaîne `npm explain`, et suivies jusqu'au correctif amont.
- Licences des dépendances de production inventoriées par `tools/dev/licenses.mjs` (liste des licences acceptées dans le script).
- Préférer une petite fonction maison à une grosse bibliothèque pour un besoin simple.
- **Alertes acceptées** (`tools/dev/audit-accepted.json`) : une alerte haute ou critique de `npm audit --omit=dev` bloque `deps-check`, sauf si elle est acceptée. Critère d'acceptation : le paquet vulnérable n'est requis par aucun module chargé à l'exécution de l'appli (bundle Metro ou code natif). Une entrée porte l'identifiant GHSA, le paquet, la plage vulnérable, `requiredBy` (les paquets qui le requièrent) et `reachableFrom` (les dépendances directes qui y mènent), tels que `tools/dev/audit.mjs` les calcule depuis le fichier de verrouillage, la raison et la date de revue. Si la plage ou les chemins changent, l'acceptation tombe. Une acceptation de plus de 90 jours est signalée par le résumé du job et par `/debut`. Chaque entrée est relue par l'audit de sécurité de la tranche qui la touche.
- **Pull requests Dependabot** (D-025) : jamais fusionnées telles quelles. Entre deux tranches, Claude ouvre une tranche `chore/Tx.y-deps-AAAA-MM` à fiche courte : diff, `npm explain` des paquets touchés, `npx expo install --check` pour la famille Expo et React (que Dependabot ignore, `.github/dependabot.yml`), empreinte native avant et après (si elle change, nouvel APK), version montée, commits au bon format ; puis il ferme la pull request Dependabot.

## Vérifications automatiques

Le workflow `checks` (`.github/workflows/checks.yml`) tourne sur chaque pull request et sur chaque push de `main` :

| Job | Fait | Obligatoire sur `main` |
| --- | --- | --- |
| `app-check` | `npm ci` puis `npm run check` (types, lint, formatage, notices SPDX, tests) et `npm run licenses` dans `app/` | Oui |
| `secrets-check` | gitleaks sur tout l'historique (sortie expurgée, aucun rapport déposé) ; refus d'une configuration gitleaks du dépôt et des annotations d'exception, comme le hook `pre-commit` | Oui |
| `deps-check` | tests de `tools/dev/audit.mjs`, puis `npm audit --omit=dev` comparé aux alertes acceptées ; tourne aussi chaque lundi sur `main` | Non : rendu bloquant par la revue quand la pull request touche `app/package.json` ou `app/package-lock.json` |

Règles :
- Les noms des jobs `app-check` et `secrets-check` sont inscrits dans la règle `protect-main` : les renommer sans relancer `tools/dev/github-settings.sh` bloque toute pull request.
- Les actions GitHub sont épinglées par SHA de commit (le dépôt l'exige) et limitées à celles de GitHub ; Dependabot propose les montées.
- Un échec se lit en une commande : `gh run view <id> --log-failed`, ou le résumé du job dans l'onglet Actions (la première ligne nomme le job et la cause).
- `deps-check` n'est pas une vérification obligatoire : un avis publié dans la nuit ne doit pas bloquer une pull request de documentation. Quand une pull request touche les fichiers de paquets, Claude le traite comme bloquant : pas de fusion tant qu'il est rouge.
- **Sortie de secours** : si GitHub Actions ou le registre npm est en panne et qu'un correctif doit entrer, l'utilisateur retire la vérification obligatoire depuis l'interface de la règle (Settings → Rules → `protect-main`), Claude le consigne dans le journal, et la règle est rétablie par `tools/dev/github-settings.sh` juste après la fusion.
- La version et la somme de contrôle de gitleaks vivent dans `tools/dev/gitleaks.env`, lues par `setup.sh`, le hook `pre-commit` et le workflow.

## Fichiers de documentation

- Fiches de tranche : `docs/tranches/Tx.y-nom-court.md`.
- Bilans de jalon : `docs/bilans/Jx-bilan.md`.
- Carnet de route : `docs/carnet-de-route/AAAA-MM-JJ-trajet.md`.
