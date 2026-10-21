#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Claude Code SessionStart hook: hands Claude the state of the project when a
# session starts, so it opens with the ritual (docs/METHOD.md) without the
# owner typing a command. Read-only: the stop signals are read with --dry-run.
# Never fails the session: a missing tool or network prints a note instead.
set -u
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0

echo "Flâne session state — open the session with the ritual (docs/METHOD.md, skill debut) at the owner's first message."
echo
echo "## Repository"
git status --short --branch 2>/dev/null | head -n 15
echo "Version: $(node -p "require('./app/package.json').version" 2>/dev/null || echo '?')"
echo
echo "## Last journal entry"
grep -m1 '^## 20' docs/JOURNAL.md 2>/dev/null || echo "(none)"
echo
echo "## In progress (backlog)"
awk '/^## En cours/{f=1;next} /^## /{f=0} f && NF' docs/BACKLOG.md 2>/dev/null | head -n 5
echo
if ! command -v gh >/dev/null 2>&1; then
  echo "(gh not available: read pull requests and stop signals by hand)"
  exit 0
fi
echo "## Open pull requests and the owner's stop signals"
prs="$(timeout 15 gh pr list --json number,title,isDraft --jq '.[] | "\(.number)\t\(if .isDraft then "draft" else "ready" end)\t\(.title)"' 2>/dev/null)" \
  || { echo "(GitHub unreachable: read the stop signals before any commit)"; exit 0; }
if [ -z "$prs" ]; then
  echo "(none)"
else
  printf '%s\n' "$prs" | while IFS=$'\t' read -r number state title; do
    echo "#$number ($state) $title"
    timeout 30 node tools/dev/owner-signals.mjs --pr "$number" --dry-run 2>&1 | sed 's/^/  /'
  done
fi
echo
echo "## Last checks"
timeout 15 gh run list --limit 2 2>/dev/null | cut -f1,2,3,5 || echo "(unavailable)"
exit 0
