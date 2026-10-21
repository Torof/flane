#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Applies the GitHub settings of the Flâne repository (T0.2) and prints what
# changed. Idempotent; run from a checkout with `gh` logged in as the owner.
#   tools/dev/github-settings.sh          # apply, then show before/after and check
#   tools/dev/github-settings.sh --check  # compare the current state with the expected one (exit 1 if it differs)
# What it sets:
#   - Actions: only GitHub-owned actions, SHA pinning required, read-only
#     GITHUB_TOKEN, approval required for workflows of every outside contributor.
#   - Dependabot automatic security pull requests: disabled (alerts stay on).
#   - Ruleset protect-main: enforcement active, no bypass, required status checks
#     app-check, secrets-check, deps-check and version-check (strict: false) posted by GitHub
#     Actions only; the other rules (deletion, non_fast_forward, pull_request
#     with merge only) are kept as they are and checked.
set -euo pipefail

REPO="${FLANE_REPO:-Torof/flane}"
RULESET_NAME="protect-main"
GITHUB_ACTIONS_APP_ID=15368
REQUIRED_CHECKS=("app-check" "deps-check" "secrets-check" "version-check")

mode="apply"
case "${1:-}" in
  "") ;;
  --check) mode="check" ;;
  *)
    echo "usage: $0 [--check]" >&2
    exit 2
    ;;
esac

need() { command -v "$1" >/dev/null 2>&1 || { echo "$1 missing" >&2; exit 1; }; }
need gh
need jq

die() { echo "$*" >&2; exit 1; }

api() {
  local out
  out="$(gh api "$@")" || die "gh api $1 failed"
  [ -n "$out" ] || die "gh api $1: empty response"
  printf '%s' "$out"
}

ruleset_id() {
  api "repos/$REPO/rulesets" | jq -r --arg n "$RULESET_NAME" '.[] | select(.name == $n) | .id' | head -n 1
}

# One line per setting, so that `diff` shows exactly what moved.
snapshot() {
  local id ruleset
  echo "actions.permissions      : $(api "repos/$REPO/actions/permissions" | jq -c '{enabled,allowed_actions,sha_pinning_required}')"
  echo "actions.selected         : $(gh api "repos/$REPO/actions/permissions/selected-actions" 2>/dev/null | jq -c '{github_owned_allowed,verified_allowed,patterns_allowed}' || echo '(not applicable)')"
  echo "actions.workflow token   : $(api "repos/$REPO/actions/permissions/workflow" | jq -c .)"
  echo "actions.fork approval    : $(api "repos/$REPO/actions/permissions/fork-pr-contributor-approval" | jq -c .)"
  echo "dependabot auto-fixes    : $(api "repos/$REPO/automated-security-fixes" | jq -c .)"
  id="$(ruleset_id)"
  if [ -z "$id" ]; then
    echo "ruleset $RULESET_NAME      : absent"
    return
  fi
  ruleset="$(api "repos/$REPO/rulesets/$id")"
  echo "ruleset.enforcement      : $(printf '%s' "$ruleset" | jq -r .enforcement)"
  echo "ruleset.bypass_actors    : $(printf '%s' "$ruleset" | jq -c '.bypass_actors // []')"
  echo "ruleset.conditions       : $(printf '%s' "$ruleset" | jq -c .conditions)"
  echo "ruleset.rules            : $(printf '%s' "$ruleset" | jq -c '[.rules[] | select(.type != "required_status_checks") | .type] | sort')"
  echo "ruleset.merge methods    : $(printf '%s' "$ruleset" | jq -c '[.rules[] | select(.type == "pull_request") | .parameters.allowed_merge_methods] | first // []')"
  echo "ruleset.required checks  : $(printf '%s' "$ruleset" | jq -c '[.rules[] | select(.type == "required_status_checks") | .parameters | {strict: .strict_required_status_checks_policy, checks: [.required_status_checks[] | "\(.context)@\(.integration_id)"] | sort}] | first // {}')"
}

expected() {
  local checks
  checks="$(printf '%s\n' "${REQUIRED_CHECKS[@]}" | jq -R --argjson app "$GITHUB_ACTIONS_APP_ID" '"\(.)@\($app)"' | jq -sc 'sort')"
  cat <<EOF
actions.permissions      : {"enabled":true,"allowed_actions":"selected","sha_pinning_required":true}
actions.selected         : {"github_owned_allowed":true,"verified_allowed":false,"patterns_allowed":[]}
actions.workflow token   : {"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}
actions.fork approval    : {"approval_policy":"all_external_contributors"}
dependabot auto-fixes    : {"enabled":false,"paused":false}
ruleset.enforcement      : active
ruleset.bypass_actors    : []
ruleset.conditions       : {"ref_name":{"exclude":[],"include":["refs/heads/main"]}}
ruleset.rules            : ["deletion","non_fast_forward","pull_request"]
ruleset.merge methods    : ["merge"]
ruleset.required checks  : {"strict":false,"checks":$checks}
EOF
}

compare_with_expected() {
  if diff <(expected) <(snapshot) >/dev/null; then
    echo "--- matches the expected state"
    return 0
  fi
  echo "--- DIFFERS from the expected state (< expected, > found)"
  diff <(expected) <(snapshot) || true
  return 1
}

before="$(snapshot)"
echo "--- before"
echo "$before"
if [ "$mode" = "check" ]; then
  compare_with_expected
  exit $?
fi

# 1. Actions: GitHub-owned only, SHA pinning required.
gh api -X PUT "repos/$REPO/actions/permissions" --input - <<'JSON' >/dev/null
{ "enabled": true, "allowed_actions": "selected", "sha_pinning_required": true }
JSON
gh api -X PUT "repos/$REPO/actions/permissions/selected-actions" --input - <<'JSON' >/dev/null
{ "github_owned_allowed": true, "verified_allowed": false, "patterns_allowed": [] }
JSON

# 2. Read-only token, no pull request approval by workflows.
gh api -X PUT "repos/$REPO/actions/permissions/workflow" --input - <<'JSON' >/dev/null
{ "default_workflow_permissions": "read", "can_approve_pull_request_reviews": false }
JSON

# 3. Approval for workflows of every outside contributor.
gh api -X PUT "repos/$REPO/actions/permissions/fork-pr-contributor-approval" --input - <<'JSON' >/dev/null
{ "approval_policy": "all_external_contributors" }
JSON

# 4. Dependabot automatic security pull requests off (alerts stay enabled).
gh api -X DELETE "repos/$REPO/automated-security-fixes" >/dev/null

# 5. Ruleset: enforcement and bypass imposed, required_status_checks replaced,
#    the other rules kept (and checked against the expected state below).
id="$(ruleset_id)"
[ -n "$id" ] || die "ruleset $RULESET_NAME not found: create it in GitHub first (pull request required, merge only)."
checks_json="$(printf '%s\n' "${REQUIRED_CHECKS[@]}" | jq -R --argjson app "$GITHUB_ACTIONS_APP_ID" '{context: ., integration_id: $app}' | jq -s .)"
current="$(api "repos/$REPO/rulesets/$id")"
updated="$(printf '%s' "$current" | jq --argjson checks "$checks_json" '
  {
    name, target,
    enforcement: "active",
    bypass_actors: [],
    conditions,
    rules: ([.rules[] | select(.type != "required_status_checks")]
      + [{type: "required_status_checks",
          parameters: {strict_required_status_checks_policy: false,
                       do_not_enforce_on_create: false,
                       required_status_checks: $checks}}])
  }')"
printf '%s' "$updated" | gh api -X PUT "repos/$REPO/rulesets/$id" --input - >/dev/null

after="$(snapshot)"
echo "--- after"
echo "$after"
echo "--- diff before/after"
diff <(echo "$before") <(echo "$after") || true
compare_with_expected
