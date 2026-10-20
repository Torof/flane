# Conventions

Fixées une fois pour toutes, pour ne plus y penser. Validées à la tranche T0.1 ; ensuite, elles ne changent que par une décision consignée.

## Langues

- **Documentation** : français.
- **Code** (identifiants, commentaires, fichiers de code) et **messages de commit** : anglais, avec les noms du glossaire.
- Les fichiers de documentation et d'outillage de la méthode (`docs/`, `.claude/`) peuvent garder des noms français.
- **Textes affichés dans l'appli** : jamais en dur dans le code ; toujours dans les fichiers de traduction (français d'abord).

## Branches

- `main` : toujours stable. Jamais de modification directe. Trois verrous, qui se recouvrent : le garde-fou de Claude (`.claude/hooks/`, bloque commit, merge, rebase et push vers `main` et `--no-verify` ; un push forcé est demandé à l'utilisateur, jamais silencieux, et consigné dans le journal), les hooks git locaux (`.githooks/`, activés par `tools/dev/setup.sh`), et la règle GitHub sur `main` (pas de push direct, pas de push forcé, pas de suppression ; disponible depuis le passage en public, D-019). La protection de branche GitHub était refusée sur le dépôt privé gratuit (« Upgrade to GitHub Pro or make this repository public »), constaté le 2026-10-20.
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

Une version par jalon : `0.0.1` à la fin du jalon 0, `0.1.0` à la fin du jalon 1, `0.2.0` à la fin du jalon 2, etc. Les corrections entre deux jalons : `0.1.1`, `0.1.2`. Chaque version est étiquetée dans Git (`v0.1.0`).

## Structure du dépôt (validée en T0.1)

```
flane/
├── CLAUDE.md
├── README.md
├── LICENSE                AGPL-3.0
├── docs/                  documentation, modèles, fiches, bilans, carnet de route
├── .claude/               compétences, agents, garde-fous de Claude Code
├── .githooks/             hooks git locaux (format des commits, secrets, pré-push)
├── .github/               vérifications automatiques, modèles d'issues et de PR
├── tools/dev/             installation des garde-fous (setup.sh), banc de tests des hooks
├── app/                   l'appli Expo (React Native, TypeScript) — naît en T0.3
│   └── src/
│       ├── domain/        modèle de données (Trip, Stop, Place, StopRequest…), sans dépendance à l'interface
│       ├── engine/        moteur de suggestions et niveaux de connaissance
│       ├── data/          stockage local, lecture et vérification des paquets
│       ├── services/      itinéraire, localisation, voix, liens Google Maps et Waze
│       ├── ui/            écrans et composants (vue complète, vue en mouvement)
│       ├── i18n/          textes de l'appli
│       └── config/        types d'arrêts, réglages
├── data-pipeline/         chaîne de fabrication des paquets régionaux
└── tools/                 simulateur, visualiseur, banc d'essai, écouteur de phrases
```

Le principe : **le domaine et le moteur ne dépendent pas de l'interface**. C'est ce qui permet de les tester seuls, de changer l'affichage (vue conducteur, vue passager, CarPlay) et de passer sur iOS sans tout réécrire.

## Code

- Chaque fichier de code commence par la notice `// SPDX-License-Identifier: AGPL-3.0-or-later` (dès T0.3). Le texte complet de la licence est dans `LICENSE`.
- TypeScript en mode strict ; pas de `any`.
- Formatage automatique (Prettier) et règles de lint (ESLint), appliqués par les vérifications automatiques.
- Fonctions courtes ; noms explicites, tirés du glossaire.
- Tests à côté du code : `trip.ts` et `trip.test.ts`.
- Aucun `console.log` contenant une position, un trajet ou une préférence.
- Les erreurs sont gérées explicitement : pas de réseau, pas de lieu trouvé, permission refusée.

## Dépendances

- Chaque ajout est justifié dans la fiche de tranche : pourquoi, alternatives, licence, maintenance.
- Licence compatible AGPL-3.0, vérifiée automatiquement.
- Versions verrouillées (fichier de verrouillage enregistré).
- Préférer une petite fonction maison à une grosse bibliothèque pour un besoin simple.

## Fichiers de documentation

- Fiches de tranche : `docs/tranches/Tx.y-nom-court.md`.
- Bilans de jalon : `docs/bilans/Jx-bilan.md`.
- Carnet de route : `docs/carnet-de-route/AAAA-MM-JJ-trajet.md`.
