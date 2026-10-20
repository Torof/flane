# Conventions

Fixées une fois pour toutes, pour ne plus y penser. Elles se valident ou s'ajustent à la tranche T0.1 ; ensuite, elles ne changent que par une décision consignée.

## Langues

- **Documentation** : français.
- **Code** (identifiants, commentaires, fichiers de code) et **messages de commit** : anglais, avec les noms du glossaire.
- Les fichiers de documentation et d'outillage de la méthode (`docs/`, `.claude/`) peuvent garder des noms français.
- **Textes affichés dans l'appli** : jamais en dur dans le code ; toujours dans les fichiers de traduction (français d'abord).

## Branches

- `main` : toujours stable. Jamais de modification directe : le garde-fou de Claude le bloque. La protection de branche côté GitHub n'est disponible pour un dépôt privé qu'avec un compte payant (GitHub Pro) ; sinon, le garde-fou et la discipline suffisent jusqu'au passage en public.
- Une branche par tranche : `feat/T1.2-osm-extract`, `fix/T2.4-route-timeout`, `chore/T0.2-ci`.
- Documentation hors tranche (journal entre deux tranches, réponses aux questions ouvertes, bilan de jalon) : branche `docs/meta-AAAA-MM-JJ`.
- Intégration par pull request, après la définition de « fini ». Le journal et le backlog sont mis à jour dans la pull request elle-même, avant l'intégration.

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

Types : `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`. Un correctif de sécurité est un `fix`, avec la mention `security` dans le corps du message. Le scope est l'identifiant de la tranche, ou `meta` pour la documentation hors tranche. Ces messages produisent automatiquement l'historique des versions.

## Versions

Une version par jalon : `0.0.1` à la fin du jalon 0, `0.1.0` à la fin du jalon 1, `0.2.0` à la fin du jalon 2, etc. Les corrections entre deux jalons : `0.1.1`, `0.1.2`. Chaque version est étiquetée dans Git (`v0.1.0`).

## Structure du dépôt (proposée, à valider en T0.1)

```
flane/
├── CLAUDE.md
├── README.md
├── docs/                  documentation, modèles, fiches, bilans, carnet de route
├── .claude/               compétences, agents, garde-fous de Claude Code
├── .github/               vérifications automatiques, modèles d'issues et de PR
├── app/                   l'appli Expo (React Native, TypeScript)
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
