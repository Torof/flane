# Journal de session

Lu au début de chaque session (`/debut`), complété à la fin (`/fin`). Les entrées les plus récentes en haut. Modèle : `docs/modeles/ENTREE_JOURNAL.md`.

---

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
