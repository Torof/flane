---
name: installation
description: Installe le projet Flâne la première fois — vérifie les outils, crée le dépôt git et le dépôt GitHub privé, enregistre le kit. À lancer quand le dossier contient le kit mais n'est pas encore un dépôt git.
---

# Installer Flâne (une seule fois)

L'utilisateur n'a fait qu'une chose : créer le dossier et y déposer le kit. Tout le reste est à faire ici, avec lui. **Présenter d'abord le plan complet, et attendre son accord avant toute commande qui modifie quelque chose.**

## 1. Vérifier, sans rien modifier

- Le contenu du kit est présent : `CLAUDE.md`, `docs/`, `.claude/`, `.gitignore`. Si les fichiers sont dans un sous-dossier (par exemple `flane-kit/`), proposer de les remonter à la racine.
- Le dossier n'est pas déjà un dépôt git (`git rev-parse --is-inside-work-tree`). S'il l'est, s'arrêter et passer à `/debut`.
- Les outils : `git --version`, `node --version` (version LTS attendue), `gh --version`, puis `gh auth status`.

Pour chaque outil manquant, dire lequel et comment l'installer sur le système de l'utilisateur, puis attendre qu'il confirme. Si `gh` n'est pas connecté, lancer `gh auth login` avec lui : c'est la seule étape qui demande son intervention (une connexion dans le navigateur).

## 2. Présenter le plan et attendre l'accord

Annoncer ce qui va être fait :
1. Créer le dépôt git local, sur la branche `main`.
2. Enregistrer le kit dans un premier commit : `docs: starter kit`.
3. Créer le dépôt GitHub **privé** `flane` (ou le nom choisi par l'utilisateur) et y envoyer ce premier commit.
4. Consigner l'installation dans le journal, sur une branche `docs/meta-AAAA-MM-JJ`, et ouvrir la pull request correspondante.

## 3. Exécuter, avec l'accord

```
git init -b main
git add .
git commit -m "docs: starter kit"
gh repo create flane --private --source=. --push
```

Le garde-fou de `.claude/hooks/` laisse passer ce tout premier commit, car la branche `main` n'existe pas encore. Il bloquera ensuite toute modification directe de `main`.

Vérifier : `git log --oneline`, `gh repo view --json name,visibility,url`.

## 4. Consigner

- Créer la branche `docs/meta-AAAA-MM-JJ`.
- Ajouter en haut de `docs/JOURNAL.md` une entrée « Installation » : outils vérifiés, dépôt créé (nom, privé), adresse du dépôt.
- Proposer de supprimer `DEMARRAGE.md`, devenu inutile.
- Montrer les modifications, enregistrer avec l'accord (`docs(meta): record installation`), pousser la branche et ouvrir la pull request avec `gh pr create`. L'utilisateur l'intègre lui-même, ou demande à Claude de le faire avec `gh pr merge`.

## 5. Enchaîner

Lancer `/debut` : il posera les questions ouvertes du backlog, puis proposera la tranche T0.1.
