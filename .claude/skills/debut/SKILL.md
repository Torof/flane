---
name: debut
description: Ouvre une session de travail sur Flâne. À lancer au début de chaque session, avant tout travail.
---

# Ouvrir une session Flâne

1. Lire la dernière entrée de `docs/JOURNAL.md` (les entrées récentes sont en haut) et la section « En cours » de `docs/BACKLOG.md`, **avec l'outil Read** (pas de `cat`, `tail`, `awk` ni `sed` : ils demandent un accord). Ne pas lire les autres documents tant que ce n'est pas nécessaire.
2. Vérifier l'état du dépôt avec des appels Bash séparés, un par commande, sans `;` ni `|` : `git status --short --branch`, `git branch --show-current`, et si possible `gh run list --limit 3`.
3. Annoncer à l'utilisateur, en quelques lignes :
   - **Jalon en cours** et son critère d'usage.
   - **Tranche en cours** et **étape du cycle** (Planifier, Discuter, Choisir, Construire, Observer, Sécuriser, Valider).
   - **Ce qui reste à cocher** pour cette étape.
   - **Prochaine action proposée.**
   - Les **questions ouvertes** du journal, s'il y en a.
4. Signaler toute incohérence : branche qui ne correspond pas à la tranche, modifications non enregistrées, vérifications en échec, étape sautée.
5. Attendre la réponse de l'utilisateur avant de faire quoi que ce soit d'autre.
