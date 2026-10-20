#!/usr/bin/env bash
# Garde-fou Flâne : empêche Claude de modifier directement la branche main
# et de forcer un push. Lit l'appel d'outil (JSON) sur l'entrée standard.
# Code de sortie 2 = l'appel est bloqué, et le message est renvoyé à Claude.
# Limite : ces règles ne remplacent pas la protection de branche côté GitHub.

input="$(cat)"

# Push forcé : toujours bloqué.
if printf '%s' "$input" | grep -qE 'git[^"]*push[^"]*(--force|-f( |"|$))'; then
  echo "Bloqué par le garde-fou Flâne : pas de push forcé. En discuter avec l'utilisateur." >&2
  exit 2
fi

# Push explicite vers main : bloqué.
if printf '%s' "$input" | grep -qE 'git[^"]*push[^"]*[ :]main( |"|$)'; then
  echo "Bloqué par le garde-fou Flâne : pas de push vers main. Passer par une branche et une pull request." >&2
  exit 2
fi

# Commit, merge, rebase ou cherry-pick alors qu'on est sur main : bloqué.
if printf '%s' "$input" | grep -qE 'git[^"]* (commit|merge|rebase|cherry-pick)( |"|$)'; then
  # Dossier courant de l'appel (compatible avec les worktrees), sinon le projet.
  dir="$(printf '%s' "$input" | grep -oE '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/')"
  [ -n "$dir" ] || dir="${CLAUDE_PROJECT_DIR:-.}"
  branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)"
  if [ "$branch" = "main" ]; then
    echo "Bloqué par le garde-fou Flâne : on est sur main. Créer d'abord une branche (voir docs/CONVENTIONS.md)." >&2
    exit 2
  fi
fi

exit 0
