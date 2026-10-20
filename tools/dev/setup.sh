#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Installe les hooks git locaux de Flâne, à lancer après chaque clonage :
#   - active les hooks git du dépôt (.githooks/) ;
#   - installe gitleaks (version épinglée, somme de contrôle vérifiée) dans ~/.local/bin ;
#   - installe la version de Node de app/.nvmrc si nvm est présent ;
#   - affiche l'état.
# Idempotent : relançable sans effet de bord. Linux x86_64 seulement pour
# l'installation automatique de gitleaks.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

# Version et somme de contrôle de gitleaks : une seule source, partagée avec
# le hook pre-commit et les vérifications automatiques.
# shellcheck source=tools/dev/gitleaks.env
. tools/dev/gitleaks.env
GITLEAKS_URL="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"

# 1. Hooks git.
git config core.hooksPath .githooks
chmod +x .githooks/* tools/dev/*.sh 2>/dev/null || true
echo "hooks git   : actifs (core.hooksPath = .githooks)"

# 2. Node : la version de app/.nvmrc, par nvm quand il est là. Node 22.15.0
#    ne retrouve pas ses modules dans un chemin qui contient un accent (« Flâne »).
#    nvm.sh ne supporte pas `set -u` : il tourne dans un sous-shell sans ces options.
if [ -f app/.nvmrc ]; then
  wanted="$(tr -d '[:space:]' < app/.nvmrc)"
  nvm_sh="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [ -s "$nvm_sh" ]; then
    if (set +eu; . "$nvm_sh" >/dev/null; nvm install "$wanted" 2>&1 | tail -n 1); then
      echo "node        : $wanted disponible (dans app/ : nvm use)"
    else
      echo "node        : installation de $wanted par nvm échouée ; installer Node $wanted à la main." >&2
    fi
  else
    echo "node        : nvm absent ; utiliser Node $wanted (app/.nvmrc)."
  fi
fi

# 3. gitleaks.
bin_dir="$HOME/.local/bin"
current=""
if command -v gitleaks >/dev/null 2>&1; then
  current="$(command -v gitleaks)"
elif [ -x "$bin_dir/gitleaks" ]; then
  current="$bin_dir/gitleaks"
fi
if [ -n "$current" ]; then
  version="$("$current" version 2>/dev/null | tr -d '[:space:]' | sed 's/^v//')"
  if [ "$version" = "$GITLEAKS_VERSION" ]; then
    echo "gitleaks    : $GITLEAKS_VERSION déjà installé ($current)"
    exit 0
  fi
  echo "gitleaks    : $version présent ($current), $GITLEAKS_VERSION attendue : installation de la version épinglée dans $bin_dir"
fi

os="$(uname -s)"
arch="$(uname -m)"
if [ "$os" != "Linux" ] || [ "$arch" != "x86_64" ]; then
  cat >&2 <<EOF
gitleaks    : installation automatique prévue pour Linux x86_64 seulement (ici : $os $arch).
  Installer gitleaks $GITLEAKS_VERSION à la main depuis https://github.com/gitleaks/gitleaks/releases
  puis relancer ce script.
EOF
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsSL --proto '=https' --tlsv1.2 -o "$tmp/gitleaks.tar.gz" "$GITLEAKS_URL"
elif command -v wget >/dev/null 2>&1; then
  wget -q --https-only -O "$tmp/gitleaks.tar.gz" "$GITLEAKS_URL"
else
  echo "gitleaks    : ni curl ni wget pour télécharger l'archive." >&2
  exit 1
fi

if ! printf '%s  %s\n' "$GITLEAKS_SHA256" "$tmp/gitleaks.tar.gz" | sha256sum -c - >/dev/null 2>&1; then
  echo "gitleaks    : somme de contrôle incorrecte, archive rejetée. Ne pas installer ; en discuter." >&2
  exit 1
fi

tar -xzf "$tmp/gitleaks.tar.gz" -C "$tmp" gitleaks
mkdir -p "$bin_dir"
install -m 0755 "$tmp/gitleaks" "$bin_dir/gitleaks"
echo "gitleaks    : $("$bin_dir/gitleaks" version 2>/dev/null) installé dans $bin_dir"

case ":$PATH:" in
  *":$bin_dir:"*) ;;
  *) echo "note        : $bin_dir n'est pas dans le PATH ; les hooks y cherchent gitleaks quand même." ;;
esac
