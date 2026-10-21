#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Installs Flâne's local git hooks; run after every clone:
#   - enables the repository's git hooks (.githooks/);
#   - installs gitleaks (pinned version, checksum verified) in ~/.local/bin;
#   - installs the Node version of app/.nvmrc if nvm is present;
#   - prints the state.
# Idempotent: can be run again without side effects. Linux x86_64 only for
# the automatic installation of gitleaks.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

# gitleaks version and checksum: a single source, shared with the pre-commit
# hook and the automatic checks.
[ -r tools/dev/gitleaks.env ] || { echo "tools/dev/gitleaks.env missing or unreadable." >&2; exit 1; }
# shellcheck source=tools/dev/gitleaks.env
. tools/dev/gitleaks.env
: "${GITLEAKS_VERSION:?gitleaks.env without GITLEAKS_VERSION}" "${GITLEAKS_SHA256:?gitleaks.env without GITLEAKS_SHA256}"
GITLEAKS_URL="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"

# 1. Hooks git.
git config core.hooksPath .githooks
chmod +x .githooks/* tools/dev/*.sh 2>/dev/null || true
echo "git hooks   : enabled (core.hooksPath = .githooks)"

# 2. Node: the version of app/.nvmrc, through nvm when it is there. Node 22.15.0
#    does not find its modules in a path that contains an accent (« Flâne »).
#    nvm.sh does not support `set -u`: it runs in a subshell without these options.
if [ -f app/.nvmrc ]; then
  wanted="$(tr -d '[:space:]' < app/.nvmrc)"
  nvm_sh="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [ -s "$nvm_sh" ]; then
    if (set +eu; . "$nvm_sh" >/dev/null; nvm install "$wanted" 2>&1 | tail -n 1); then
      echo "node        : $wanted available (in app/: nvm use)"
    else
      echo "node        : installing $wanted with nvm failed; install Node $wanted by hand." >&2
    fi
  else
    echo "node        : nvm missing; use Node $wanted (app/.nvmrc)."
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
    echo "gitleaks    : $GITLEAKS_VERSION already installed ($current)"
    exit 0
  fi
  echo "gitleaks    : $version present ($current), $GITLEAKS_VERSION expected: installing the pinned version in $bin_dir"
fi

os="$(uname -s)"
arch="$(uname -m)"
if [ "$os" != "Linux" ] || [ "$arch" != "x86_64" ]; then
  cat >&2 <<EOF
gitleaks    : automatic installation is meant for Linux x86_64 only (here: $os $arch).
  Install gitleaks $GITLEAKS_VERSION by hand from https://github.com/gitleaks/gitleaks/releases
  then run this script again.
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
  echo "gitleaks    : neither curl nor wget to download the archive." >&2
  exit 1
fi

if ! printf '%s  %s\n' "$GITLEAKS_SHA256" "$tmp/gitleaks.tar.gz" | sha256sum -c - >/dev/null 2>&1; then
  echo "gitleaks    : wrong checksum, archive rejected. Do not install; discuss it." >&2
  exit 1
fi

tar -xzf "$tmp/gitleaks.tar.gz" -C "$tmp" gitleaks
mkdir -p "$bin_dir"
install -m 0755 "$tmp/gitleaks" "$bin_dir/gitleaks"
echo "gitleaks    : $("$bin_dir/gitleaks" version 2>/dev/null) installed in $bin_dir"

case ":$PATH:" in
  *":$bin_dir:"*) ;;
  *) echo "note        : $bin_dir is not in the PATH; the hooks look for gitleaks there anyway." ;;
esac
