#!/usr/bin/env bash
# Garde-fou Flâne : enveloppe du hook PreToolUse (outil Bash) de Claude Code.
# L'analyse est faite par garde-branche-main.py (bibliothèque standard python).
# Toute panne (python3 absent, exception, délai) = appel bloqué (sortie 2) :
# Claude Code laisserait passer l'appel si le hook échouait autrement.
# Testé par tools/dev/test-hooks.sh. Limite : ne remplace pas la règle GitHub
# qui protège main côté serveur.
set -u

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Bloqué par le garde-fou Flâne : python3 introuvable, la commande ne peut pas être analysée. Installer python3 ou en discuter avec l'utilisateur." >&2
  exit 2
fi

if command -v timeout >/dev/null 2>&1; then
  timeout 20 python3 -I -B -X utf8 "$dir/garde-branche-main.py"
else
  python3 -I -B -X utf8 "$dir/garde-branche-main.py"
fi
rc=$?

case "$rc" in
  0|2) exit "$rc" ;;
  124) echo "Bloqué par le garde-fou Flâne : analyse trop longue (délai dépassé). Réessayer ou en discuter avec l'utilisateur." >&2; exit 2 ;;
  *)   echo "Bloqué par le garde-fou Flâne : garde-fou en panne (code $rc). Ne pas contourner ; en discuter avec l'utilisateur." >&2; exit 2 ;;
esac
