# Journal de session

Lu au début de chaque session (`/debut`), complété à la fin (`/fin`). Les entrées les plus récentes en haut. Modèle : `docs/modeles/ENTREE_JOURNAL.md`.

---

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
