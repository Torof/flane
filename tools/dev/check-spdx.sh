#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Checks that every code file carries the SPDX licence notice in its first two
# lines (after an optional shebang). Usage: check-spdx.sh [root-directory]
# Code files: *.ts *.tsx *.js *.mjs *.cjs *.sh and the git hooks in .githooks/.
# Skipped: node_modules, android, ios, .expo, dist, coverage, .git, and
# generated files (expo-env.d.ts). Exit code 1 if at least one notice is missing.
set -euo pipefail

root="${1:-.}"
notice='SPDX-License-Identifier: AGPL-3.0-or-later'
missing=0

while IFS= read -r -d '' file; do
  if ! head -n 2 "$file" | grep -qF "$notice"; then
    echo "missing SPDX notice: $file"
    missing=$((missing + 1))
  fi
done < <(
  find "$root" \
    \( -name node_modules -o -name android -o -name ios -o -name .expo \
       -o -name dist -o -name coverage -o -name .git \) -prune \
    -o -type f \
       \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \
          -o -name '*.cjs' -o -name '*.sh' -o -path '*/.githooks/*' \) \
       ! -name 'expo-env.d.ts' ! -name '*.d.ts' \
    -print0
)

if [ "$missing" -gt 0 ]; then
  echo "$missing file(s) without SPDX notice."
  exit 1
fi
echo "SPDX notices: all code files carry one."
