#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Applies the GitHub settings of the Flâne repository (T0.2) and prints what
# changed. Idempotent; run from a checkout with `gh` logged in as the owner.
#   tools/dev/github-settings.sh          # apply, then show before/after
#   tools/dev/github-settings.sh --check  # show the current state only
# What it sets:
#   - Actions: only GitHub-owned actions, SHA pinning required, read-only
#     GITHUB_TOKEN, approval required for workflows of every outside contributor.
#   - Dependabot automatic security pull requests: disabled (alerts stay on).
#   - Ruleset protect-main: required status checks app-check and secrets-check
#     (strict: false), posted by GitHub Actions only; other rules untouched.
set -euo pipefail

REPO="${FLANE_REPO:-Torof/flane}"
RULESET_NAME="protect-main"
GITHUB_ACTIONS_APP_ID=15368
REQUIRED_CHECKS=("app-check" "secrets-check")

check_only=0
[ "${1:-}" = "--check" ] && check_only=1

need() { command -v "$1" >/dev/null 2>&1 || { echo "$1 manquant" >&2; exit 1; }; }
need gh
need jq

snapshot() {
  echo "actions.permissions      : $(gh api "repos/$REPO/actions/permissions" | jq -c '{enabled,allowed_actions,sha_pinning_required}')"
  echo "actions.selected         : $(gh api "repos/$REPO/actions/permissions/selected-actions" 2>/dev/null | jq -c '{github_owned_allowed,verified_allowed,patterns_allowed}' || echo '(non applicable)')"
  echo "actions.workflow token   : $(gh api "repos/$REPO/actions/permissions/workflow" | jq -c .)"
  echo "actions.fork approval    : $(gh api "repos/$REPO/actions/permissions/fork-pr-contributor-approval" | jq -c .)"
  echo "dependabot auto-fixes    : $(gh api "repos/$REPO/automated-security-fixes" | jq -c .)"
  local id
  id="$(ruleset_id)"
  if [ -n "$id" ]; then
    echo "ruleset $RULESET_NAME ($id) : $(gh api "repos/$REPO/rulesets/$id" | jq -c '{enforcement, bypass_actors, conditions, rules: [.rules[] | {type, parameters}]}')"
  else
    echo "ruleset $RULESET_NAME      : absent"
  fi
}

ruleset_id() {
  gh api "repos/$REPO/rulesets" --jq ".[] | select(.name == \"$RULESET_NAME\") | .id" | head -n 1
}

before="$(snapshot)"
echo "--- avant"
echo "$before"
if [ "$check_only" -eq 1 ]; then
  exit 0
fi

# 1. Actions: GitHub-owned only, SHA pinning required.
gh api -X PUT "repos/$REPO/actions/permissions" \
  --input - <<'JSON' >/dev/null
{ "enabled": true, "allowed_actions": "selected", "sha_pinning_required": true }
JSON
gh api -X PUT "repos/$REPO/actions/permissions/selected-actions" \
  --input - <<'JSON' >/dev/null
{ "github_owned_allowed": true, "verified_allowed": false, "patterns_allowed": [] }
JSON

# 2. Read-only token, no pull request approval by workflows.
gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  --input - <<'JSON' >/dev/null
{ "default_workflow_permissions": "read", "can_approve_pull_request_reviews": false }
JSON

# 3. Approval for workflows of every outside contributor.
gh api -X PUT "repos/$REPO/actions/permissions/fork-pr-contributor-approval" \
  --input - <<'JSON' >/dev/null
{ "approval_policy": "all_external_contributors" }
JSON

# 4. Dependabot automatic security pull requests off (alerts stay enabled).
gh api -X DELETE "repos/$REPO/automated-security-fixes" >/dev/null

# 5. Ruleset: add (or replace) the required_status_checks rule, keep the rest.
id="$(ruleset_id)"
if [ -z "$id" ]; then
  echo "ruleset $RULESET_NAME introuvable : le créer d'abord dans GitHub (pull request obligatoire, merge seulement)." >&2
  exit 1
fi
checks_json="$(printf '%s\n' "${REQUIRED_CHECKS[@]}" | jq -R --argjson app "$GITHUB_ACTIONS_APP_ID" '{context: ., integration_id: $app}' | jq -s .)"
current="$(gh api "repos/$REPO/rulesets/$id")"
updated="$(printf '%s' "$current" | jq --argjson checks "$checks_json" '
  {
    name, target, enforcement,
    bypass_actors: (.bypass_actors // []),
    conditions,
    rules: ([.rules[] | select(.type != "required_status_checks")]
      + [{type: "required_status_checks",
          parameters: {strict_required_status_checks_policy: false,
                       do_not_enforce_on_create: false,
                       required_status_checks: $checks}}])
  }')"
printf '%s' "$updated" | gh api -X PUT "repos/$REPO/rulesets/$id" --input - >/dev/null

after="$(snapshot)"
echo "--- après"
echo "$after"
echo "--- diff"
diff <(echo "$before") <(echo "$after") || true
