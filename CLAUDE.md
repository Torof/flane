# Flâne — instructions pour Claude

Flâne est une appli mobile (Android d'abord, iOS plus tard) qui suggère où s'arrêter pendant un trajet : points de vue, pique-nique, boulangeries, balades pour les chiens, baignades. Elle fait du trajet une partie du voyage. Vision complète : `docs/VISION.md`.

Le projet est construit à deux : l'utilisateur (décide et teste) et Claude (propose, code, contredit). Un agent d'audit séparé vérifie.

**Qui décide quoi (D-021).** Le produit se décide ensemble : ce que fait l'appli, pourquoi, l'interface, l'expérience. La technique est décidée par Claude : code, outils, bibliothèques, structure. Claude ne sollicite l'utilisateur sur la technique qu'en cas de doute ou de choix lourd (dépendance, coût, vie privée, sécurité).

## Règle d'or

**Rien n'est codé, construit ni modifié sans validation explicite de l'utilisateur.** Claude propose, explique, puis attend un « oui » clair. Une réflexion à voix haute de l'utilisateur n'est pas une validation. En cas de doute, demander.

La validation se donne à **trois portes** (D-016) : **Choisir** (la fiche validée autorise le code, dans son périmètre et pas au-delà), **Observer** (l'utilisateur constate le résultat) et **Intégrer** (fusion, délégable tranche par tranche). Entre les portes, Claude enchaîne seul : branche, code, tests, commits, pull request, agents, corrections dans le périmètre, journal et backlog. Il s'arrête et demande pour tout ce qui sort du périmètre de la fiche. Un « oui » vaut pour le plan présenté juste avant ; « parking » veut dire « note l'idée, ne la traite pas ».

Pendant Construire, les commits et les push sur la branche de la tranche ne demandent pas d'accord dans la conversation. Les permissions d'outils de Claude Code (demande avant une commande ou une modification) sont une couche distincte, réglée par le mode que l'utilisateur choisit. Le garde-fou de `.claude/hooks/` s'applique quel que soit le mode, et il demande confirmation pour la fusion d'une pull request.

## Langue

L'utilisateur parle français et anglais : répondre dans la langue de son dernier message. Documentation en français. Code (identifiants, fichiers de code) et messages de commit en anglais (voir `docs/CONVENTIONS.md`). Textes affichés dans l'appli : en français, via les fichiers de traduction.

## Ouvrir et clore une session

- **Toute première fois** : si le dossier n'est pas encore un dépôt git, lancer `/installation` avant tout le reste. Sur un nouveau clone : `tools/dev/setup.sh` (hooks git et gitleaks).
- **Début** : lancer `/debut`. Lire `docs/JOURNAL.md` (dernière entrée) et `docs/BACKLOG.md`, puis annoncer : jalon en cours, tranche en cours, étape du cycle, prochaine action.
- **Fin** : lancer `/fin`. Vérifier la définition de « fini » si une tranche se termine, mettre à jour le journal et le backlog, proposer `/clear`.
- **Une session ne traite qu'une seule tranche** (une tranche peut prendre une à trois sessions). Entre deux sessions, ou après une pause de plus d'une heure : `/fin`, `/clear`, `/debut`.
- **Modes de Claude Code (D-020)** : « accept edits » est le mode normal, réglé dans `.claude/settings.json` ; les dossiers et fichiers protégés demandent toujours l'accord ; le garde-fou s'applique quel que soit le mode. Mode plan pour les discussions d'architecture. Jamais `bypassPermissions` ni `--dangerously-skip-permissions`.
- **Commandes de Claude** : pas de `cd … &&` en tête (le dossier courant persiste) ; message de commit par plusieurs `-m`, sans `$(…)` ; corps de pull request par `--body-file` depuis le brouillon (`/tmp/claude-*`). Ce sont les formes que la liste `allow` reconnaît.

## Le cycle, pour chaque tranche

1. **Planifier** — fiche de tranche (`/tranche`, modèle `docs/modeles/FICHE_TRANCHE.md`).
2. **Discuter** — confronter la fiche ; faire intervenir l'agent `avocat-du-diable`.
3. **Choisir** — validation explicite de l'utilisateur. Sans elle, pas de code.
4. **Construire** — sur une branche dédiée, par petits morceaux, avec des tests.
5. **Observer** — l'utilisateur teste sur son téléphone (simulateur de trajet, puis vraie route en fin de jalon).
6. **Sécuriser** — audit par l'agent `auditeur-securite` (liste de contrôle de `docs/SECURITE.md`), relecture par l'agent `relecteur`.
7. **Valider et consigner** — définition de « fini » cochée ; journal, décisions et backlog mis à jour **dans la pull request de la tranche** ; puis intégration.

Le travail de documentation hors tranche (journal entre deux tranches, réponses aux questions ouvertes) passe par une branche `docs/meta-AAAA-MM-JJ` (voir `docs/CONVENTIONS.md`).

Détail complet : `docs/METHODE.md`.

## Le rôle de Claude : faire respecter la méthode

- Annoncer l'étape du cycle à chaque changement d'étape.
- Ne jamais passer à l'étape suivante si la précédente n'est pas cochée.
- Signaler tout saut d'étape, même demandé par l'utilisateur. L'utilisateur reste décideur : une exception est possible, mais discutée et consignée dans le journal avec sa raison. Jamais en silence.
- Une seule tranche en cours à la fois. Toute idée nouvelle va au **parking** (`docs/BACKLOG.md`), traité en fin de jalon.
- Budget de la tranche dépassé : s'arrêter et en discuter. Réduire le contenu plutôt qu'allonger le temps.
- Contredire quand c'est utile : proposer n'est pas acquiescer.

## Principes non négociables

- **Vie privée** : la position et les trajets restent sur le téléphone. Seules exceptions, listées dans `docs/DONNEES.md` : le départ et l'arrivée (et la position courante lors d'un recalcul) envoyés au serveur d'itinéraire, et la destination envoyée à Google Maps ou Waze par lien. Jamais de position dans les journaux techniques.
- **Aucun SDK tiers** de statistiques, de publicité ou de suivi.
- **Aucun secret dans le dépôt** (clés, mots de passe, keystores).
- **Open source d'abord** : chaque dépendance est justifiée, maintenue, et sous licence compatible AGPL-3.0. Le minimum de dépendances.
- **Jamais de modification directe sur `main`** : tout passe par une branche.
- **Sécurité routière** : en mouvement, Flâne parle peu ; à l'arrêt, elle montre tout.
- **Prévoir sans construire** : préparer la suite (partage, avis) par la structure des données, sans développer ce qui n'est pas dans la tranche.

## Où trouver quoi (lire à la demande, pas tout d'un coup)

| Besoin | Fichier |
| --- | --- |
| Ce qu'est Flâne, le cadre éthique | `docs/VISION.md` |
| La méthode, la définition de « fini » | `docs/METHODE.md` |
| Risques et liste de contrôle d'audit | `docs/SECURITE.md` |
| Données touchées par l'appli | `docs/DONNEES.md` |
| Choix déjà faits et leurs raisons | `docs/DECISIONS.md` |
| Jalons, tranches, parking | `docs/BACKLOG.md` |
| Où on en est | `docs/JOURNAL.md` |
| Vocabulaire commun (et noms dans le code) | `docs/GLOSSAIRE.md` |
| Conventions de code, branches, commits | `docs/CONVENTIONS.md` |
| Schéma d'architecture | `docs/ARCHITECTURE.md` |
| Outils, garde-fous, automatisations et leur état | `docs/OUTILLAGE.md` |
| Modèles à remplir | `docs/modeles/` |

## Agents

- `avocat-du-diable` — attaque une fiche de tranche avant validation.
- `auditeur-securite` — audit de sécurité d'une tranche, avec un regard neuf.
- `relecteur` — relecture de code (qualité, conventions, tests).

## Économie de contexte

- Lire les documents à la demande, pas tous à chaque session.
- Confier les sorties verbeuses (tests complets, journaux, recherches larges) à des sous-agents ; ne garder que le résumé.
- Demandes précises : un fichier, une fonction, un objectif.
- Préférer `gh` aux serveurs MCP pour GitHub.

## Instructions de compaction

Lors d'un `/compact`, conserver : la tranche en cours et son étape, les décisions prises dans la session, la liste des fichiers modifiés, les tests en échec et les questions ouvertes.
