# Démarrer Flâne

1. Crée un dossier `flane`.
2. Décompresse le kit dedans. Les fichiers doivent être directement dans `flane` (dont le dossier caché `.claude`).
3. Ouvre Claude Code dans ce dossier et dis-lui :

   > Lis CLAUDE.md et installe le projet.

Claude Code vérifie les outils, crée le dépôt git et le dépôt GitHub privé, et enregistre le kit. Il te demande ton accord avant chaque action. La seule chose qu'il peut te demander de faire toi-même : installer un outil manquant (Git, Node.js, l'outil `gh` de GitHub), ou te connecter à GitHub dans ton navigateur.

Ensuite, il enchaîne avec `/debut` et te pose les trois questions ouvertes : la région du premier paquet, ton trajet de référence, et le nom de l'appli.

## Bon à savoir

Par défaut, Claude Code te demande l'autorisation avant chaque modification : c'est ta règle « rien sans mon accord ». Attention, le premier appui sur Maj+Tab active l'acceptation automatique des modifications. Pour le mode plan (Claude propose sans rien modifier), appuie sur Maj+Tab jusqu'à voir « plan mode ».

Les commandes du projet : `/debut` en début de session, `/tranche` pour planifier, `/fin` en fin de session, puis `/clear`, et `/bilan-jalon` en fin de jalon.
