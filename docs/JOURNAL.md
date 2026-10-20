# Journal de session

Lu au début de chaque session (`/debut`), complété à la fin (`/fin`). Les entrées les plus récentes en haut. Modèle : `docs/modeles/ENTREE_JOURNAL.md`.

---

## 2026-10-20 — T0.1b Kit Claude : zéro interruption inutile

**Tranche** : T0.1b — Kit Claude (jalon 0).
**Étape** : Valider.

**Fait**
- L'utilisateur, épuisé par les demandes d'accord de Claude Code, a demandé un processus réellement automatique. Fiche courte, attaquée par l'avocat du diable (douze objections, redécoupée : le démarrage automatique part en T0.1c), validée.
- Livré : mode « accept edits » permanent (D-020) ; liste `allow` courte et figée dans le banc, dans la forme que cette version de Claude Code reconnaît (`Bash(git commit *)`) ; garde-fou durci pour que son silence vaille accord (dérivés dangereux de chaque préfixe autorisé bloqués ou demandés) ; `ask` étendu à `CLAUDE.md`, `.gitignore`, `.mcp.json`, `.git/**` ; commande du hook qui bloque si le script manque ; `settings.local.json` vidé ; conventions de commande ; D-021 (le produit se décide ensemble, la technique par Claude).
- Sécuriser : audit « bloquant » (retours en arrière par `switch -c`/`--orphan`/`-`, `diff --no-index`, `/dev/tcp`, `add -f`, `commit -F`, `gh --comments`/`-R`), tout fermé avec tests ; relecture « à corriger », tout traité.

**Décisions** : D-020, D-021.

**Exceptions à la méthode**
- Porte Observer reportée à la session suivante, décidée par Claude : les réglages de Claude Code ne se chargent qu'au redémarrage, et l'utilisateur ne pouvait pas rester devant l'écran. À constater au prochain `/debut` : plus aucune demande pour lire, éditer, tester, commiter, pousser, ouvrir une PR.
- Cette tranche a elle-même généré beaucoup de demandes d'accord : elle modifie les fichiers protégés par conception. C'est la dernière qui les touche en volume.

**Questions ouvertes**
- Si des demandes subsistent à la session suivante pour des commandes de la liste `allow`, vérifier la forme des règles et le rechargement des réglages.

**Prochaine étape**
- `/clear`, puis `/debut` dans une nouvelle session. Constater le silence. Puis `/tranche` pour T0.2 (ou T0.1c).

## 2026-10-20 — T0.1 Dépôt et garde-fous

**Tranche** : T0.1 — Dépôt et garde-fous (jalon 0).
**Étape** : Valider.

**Fait**
- Fiche planifiée, attaquée par l'avocat du diable (seize objections, toutes retenues, tranche redécoupée : kit Claude en T0.1b), validée à la porte Choisir. Puis décision de passer le dépôt en public dès cette tranche (D-019).
- Historique réécrit vers l'identité anonyme GitHub avant le passage en public.
- Livré : `LICENSE` AGPL-3.0 ; hooks git (`commit-msg`, `pre-commit` avec gitleaks 8.30.1, `pre-push`) ; `tools/dev/setup.sh` ; garde-fou de Claude réécrit (enveloppe fermée par défaut, analyse python, trois décisions : bloquer, autoriser, demander) ; `tools/dev/test-hooks.sh` (187 cas) ; `.editorconfig` ; modèles d'issues et de PR ; dépôt public avec règle `protect-main` (pas de suppression, pas de push forcé, pull request obligatoire, fusion par merge seulement, aucun contournement), recherche de secrets et blocage des push, alertes et correctifs Dependabot ; conventions, carte des risques, données, glossaire, inventaire d'outillage à jour.
- Sécuriser : audit de sécurité (verdict « à corriger » : six contournements du garde-fou démontrés, tous fermés et couverts par des tests négatifs ; limites connues consignées dans `docs/SECURITE.md`) et relecture (verdict « conforme », points de forme corrigés).
- Observer : l'utilisateur a constaté le banc de tests au vert, la règle sur `main` et les réglages GitHub.

**Décisions** : D-017 (suivi : backlog source de vérité, Issues boîte de réception), D-018 (fusion par merge uniquement), D-019 (dépôt public sous AGPL-3.0).

**Exceptions à la méthode**
- Push forcé de `main` fait par Claude pour y mettre l'historique anonymisé, avant le passage en public, avec confirmation explicite de l'utilisateur dans l'outil. Dépôt alors privé, aucun autre contributeur. À cette occasion, l'utilisateur a décidé que le garde-fou **demande** tout push forcé au lieu de le bloquer ; la règle GitHub l'interdit de toute façon côté serveur.
- La protection de `main` a d'abord été constatée indisponible (dépôt privé gratuit), puis obtenue par le passage en public : le périmètre de la fiche a été amendé en cours de tranche, avec l'accord de l'utilisateur.
- La pull request numéro 3 a été fusionnée par l'utilisateur depuis GitHub pendant l'étape Observer, avant la fin de l'étape Sécuriser : les correctifs de l'audit et la consignation ont été intégrés juste après par la pull request numéro 4. Leçon pour la méthode : la porte Intégrer n'est ouverte qu'une fois la définition de « fini » cochée, et c'est Claude qui la présente ; la règle GitHub pourra exiger les vérifications de T0.2 pour l'imposer.

**Questions ouvertes**
- Dépôt de marque « Flâne » à l'INPI : quand ? (backlog)

**Prochaine étape**
- `/tranche` pour T0.1b (kit Claude : démarrage automatique, liste `allow`), en gardant en tête les limites connues du garde-fou.

## 2026-10-20 — Automatisation du processus

**Tranche** : aucune (méthode, hors cycle).
**Étape** : —

**Fait**
- Discussion sur l'automatisation du processus de développement : rapide, sûr, sans trous découverts après coup.
- D-016 : trois portes de validation (Choisir, Observer, Intégrer), autonomie de Claude entre elles ; règle d'or précisée dans `CLAUDE.md` et `docs/METHODE.md`.
- `docs/OUTILLAGE.md` créé : inventaire des garde-fous, compétences, vérifications, réglages et outils du produit, avec l'état et la tranche propriétaire de chacun.
- Backlog : T0.1, T0.2 et T0.3 détaillés ; parking enrichi (banc d'essai en PR, `SECURITY.md`).
- Modèle de fiche : liste des « trous fréquents » à passer en revue avant l'étape Discuter.
- Pull request numéro 1 intégrée par Claude, à la demande de l'utilisateur (fusion sans squash, pour garder les messages de commit).

**Décisions** : D-016 (trois portes).

**Exceptions à la méthode** : aucune.

**Questions ouvertes**
- Aucune.

**Prochaine étape**
- `/tranche` pour la fiche de T0.1.

## 2026-10-20 — Installation

**Tranche** : aucune (installation, hors cycle).
**Étape** : —

**Fait**
- Kit décompressé à la racine du dossier (le dossier caché `.claude/` et le `.gitignore` manquaient, ajoutés depuis l'archive).
- Outils vérifiés : Git 2.53, Node.js v22.15 (LTS), GitHub CLI 2.46 connecté au compte Torof.
- Dépôt git local créé sur `main`, kit enregistré dans le commit `docs: starter kit`.
- Dépôt GitHub privé créé : `flane`, https://github.com/Torof/flane.
- `DEMARRAGE.md` supprimé, devenu inutile.
- Questions ouvertes du backlog répondues : Hautes-Alpes (05) ; Briançon–Embrun et Briançon–Marseille ; identifiant `app.flane`.

**Décisions** : D-015 (identifiant de l'appli).

**Exceptions à la méthode** : aucune.

**Questions ouvertes**
- Aucune.

**Prochaine étape**
- `/tranche` pour la fiche de T0.1.

## 2026-10-20 — Préparation du terrain (claude.ai)

**Tranche** : aucune (préparation, hors cycle).
**Étape** : —

**Fait**
- Vision, cadre éthique, périmètre de Flâne seule, technologies, sécurité, méthode, outils et jalons définis ensemble dans claude.ai.
- Kit de démarrage du dépôt produit : `CLAUDE.md`, documentation (`docs/`), modèles, compétences `/debut`, `/fin`, `/tranche`, `/bilan-jalon`, agents (`avocat-du-diable`, `auditeur-securite`, `relecteur`), garde-fou qui bloque les modifications directes sur `main` (testé).
- Kit relu par un agent indépendant ; corrections appliquées (garde-fou robuste, flux de données réels précisés dans `DONNEES.md`, statuts harmonisés, branche `docs/meta-…` pour la documentation hors tranche, points juridiques précisés).

**Décisions** : D-001 à D-014 (voir `docs/DECISIONS.md`).

**Exceptions à la méthode** : aucune.

**Questions ouvertes**
- Région du premier paquet.
- Trajet de référence.
- Nom du dépôt et identifiant de l'appli.

**Prochaine étape**
1. Lancer `/installation` (dépôt git, dépôt GitHub privé, premier commit).
2. Lancer `/debut` et répondre aux questions ouvertes.
3. Lancer `/tranche` pour **T0.1 — Dépôt et conventions** (étape Planifier).
