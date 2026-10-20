#!/usr/bin/env bash
# Banc de tests des garde-fous de Flâne : hooks git (.githooks/) et garde-fou
# de Claude (.claude/hooks/garde-branche-main.sh). Tout se passe dans des
# dépôts git temporaires ; le poste n'est pas modifié.
#
#   bash tools/dev/test-hooks.sh        une ligne PASS/FAIL par cas, sortie 1 si un échec
#   bash tools/dev/test-hooks.sh -v     affiche aussi le message du hook sur les PASS
set -u

VERBOSE=0
[ "${1:-}" = "-v" ] && VERBOSE=1

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# HOOK_OVERRIDE permet de tester une enveloppe candidate avant de l'installer.
HOOK="${HOOK_OVERRIDE:-$ROOT/.claude/hooks/garde-branche-main.sh}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Isolation : aucune configuration git du poste (hooksPath, gpgsign…), aucune
# variable de Claude Code.
export GIT_CONFIG_NOSYSTEM=1
export GIT_CONFIG_GLOBAL="$TMP/gitconfig"
unset CLAUDE_PROJECT_DIR
git config --file "$GIT_CONFIG_GLOBAL" user.name "Test Flâne"
git config --file "$GIT_CONFIG_GLOBAL" user.email "test@example.invalid"
git config --file "$GIT_CONFIG_GLOBAL" commit.gpgsign false
git config --file "$GIT_CONFIG_GLOBAL" init.defaultBranch main

pass=0
fail=0
ok() { printf 'PASS  %s\n' "$1"; pass=$((pass + 1)); [ "$VERBOSE" = 1 ] && [ -n "${2:-}" ] && printf '      %s\n' "$2"; return 0; }
ko() { printf 'FAIL  %s\n      %s\n' "$1" "$2"; fail=$((fail + 1)); return 0; }
first_line() { printf '%s' "$1" | head -n 1; }

# ---------------------------------------------------------------------------
# Dépôts temporaires
# ---------------------------------------------------------------------------
nouveau_depot() { # <dossier> [branche]
  local dir="$1" branch="${2:-}"
  mkdir -p "$dir"
  git -C "$dir" init -q -b main
  printf 'init\n' >"$dir/README.md"
  git -C "$dir" add README.md
  git -C "$dir" commit -q -m "chore(T0.1): init"
  if [ -n "$branch" ]; then git -C "$dir" checkout -q -b "$branch"; fi
}
nouveau_depot "$TMP/sur-main"
nouveau_depot "$TMP/sur-branche" "feat/T0.1-test"
nouveau_depot "$TMP/avec-hooks" "feat/T0.1-test"
git -C "$TMP/avec-hooks" config core.hooksPath "$ROOT/.githooks"
mkdir -p "$TMP/pas-un-depot" "$TMP/home-vide" "$TMP/depot-vide"
git -C "$TMP/depot-vide" init -q -b main   # aucun commit : branche « non née »

# ---------------------------------------------------------------------------
# [commit-msg]
# ---------------------------------------------------------------------------
msg_case() { # <0|1 attendu> <message>
  local expected="$1" message="$2" rc out
  printf '%s\n' "$message" >"$TMP/msg"
  out="$(bash "$ROOT/.githooks/commit-msg" "$TMP/msg" 2>&1)"; rc=$?
  if [ "$rc" -eq "$expected" ]; then
    ok "[commit-msg] $(first_line "$message") → $([ "$expected" = 0 ] && echo accepté || echo refusé)" "$(first_line "$out")"
  else
    ko "[commit-msg] $(first_line "$message")" "attendu code $expected, obtenu $rc : $(first_line "$out")"
  fi
}
msg_case 0 "feat(T0.1): ok"
msg_case 0 "chore(T0.1b): ok"
msg_case 0 "fix(T2.4)!: breaking"
msg_case 0 "docs(meta): x"
msg_case 0 'Revert "feat(T0.1): ok"'
msg_case 0 "Merge pull request #3 from x/y"
msg_case 0 "Merge branch 'x'"
msg_case 0 "$(printf '# commentaire\n\nfeat(T0.1): après un commentaire\n\ncorps')"
msg_case 1 "feat: no scope"
msg_case 1 "Merged stuff"
msg_case 1 "fixup! x"
msg_case 1 "squash! x"
msg_case 1 "feat(T0.1) : espace"
msg_case 1 "feat(t0.1): minuscule"
msg_case 1 "chore: x"
msg_case 1 ""

# De bout en bout : le hook est bien câblé par core.hooksPath.
if git -C "$TMP/avec-hooks" commit -q --allow-empty -m "feat: no scope" 2>/dev/null; then
  ko "[commit-msg] câblage core.hooksPath" "un message hors format a été accepté"
else
  ok "[commit-msg] câblage core.hooksPath : message hors format refusé"
fi
if git -C "$TMP/avec-hooks" commit -q --allow-empty -m "chore(T0.1): ok" 2>"$TMP/err"; then
  ok "[commit-msg] câblage core.hooksPath : message conforme accepté"
else
  ko "[commit-msg] câblage core.hooksPath : message conforme" "$(first_line "$(cat "$TMP/err")")"
fi

# ---------------------------------------------------------------------------
# [pre-commit] : fausse clé assemblée à l'exécution (règle github-pat de gitleaks).
# ---------------------------------------------------------------------------
part_a="0A1B2C3D4E5F6G7H8I"
part_b="9JKLMNOPQRSTUVWXYZ"
fake_token="ghp_${part_a}${part_b}"
gitleaks_present=0
if command -v gitleaks >/dev/null 2>&1 || [ -x "$HOME/.local/bin/gitleaks" ]; then gitleaks_present=1; fi

run_pre_commit() { # [env…] ; stdout/stderr dans $TMP/err ; code dans $?
  (cd "$TMP/avec-hooks" && env "$@" bash "$ROOT/.githooks/pre-commit") >"$TMP/err" 2>&1
}

printf 'token = "%s"\n' "$fake_token" >"$TMP/avec-hooks/config.txt"
git -C "$TMP/avec-hooks" add config.txt
if [ "$gitleaks_present" = 1 ]; then
  if run_pre_commit X=1; then
    ko "[pre-commit] fausse clé indexée" "le commit a été accepté"
  elif grep -q 'règle github-pat' "$TMP/err"; then
    ok "[pre-commit] fausse clé indexée → refusée, règle github-pat citée" "$(grep 'règle' "$TMP/err" | head -n 1)"
  else
    ko "[pre-commit] fausse clé indexée" "refusée mais sans citer la règle : $(first_line "$(cat "$TMP/err")")"
  fi
  if grep -q "$fake_token" "$TMP/err"; then
    ko "[pre-commit] le secret n'apparaît pas dans la sortie" "la valeur du secret a été affichée"
  else
    ok "[pre-commit] le secret n'apparaît pas dans la sortie"
  fi
else
  ko "[pre-commit] fausse clé indexée" "gitleaks absent sur ce poste : lancer tools/dev/setup.sh"
fi

printf 'token = "none"\n' >"$TMP/avec-hooks/config.txt"
git -C "$TMP/avec-hooks" add config.txt
if [ "$gitleaks_present" = 1 ]; then
  if run_pre_commit X=1; then
    ok "[pre-commit] fichier sans secret → accepté"
  else
    ko "[pre-commit] fichier sans secret" "$(first_line "$(cat "$TMP/err")")"
  fi
else
  ko "[pre-commit] fichier sans secret" "gitleaks absent sur ce poste : lancer tools/dev/setup.sh"
fi

# gitleaks absent : PATH sans son dossier, HOME vide.
path_sans=""
gitleaks_dir=""
if command -v gitleaks >/dev/null 2>&1; then gitleaks_dir="$(dirname "$(command -v gitleaks)")"; fi
IFS=: read -r -a path_parts <<<"$PATH"
for p in "${path_parts[@]}"; do
  [ "$p" = "$gitleaks_dir" ] && continue
  [ "$p" = "$HOME/.local/bin" ] && continue
  path_sans="${path_sans:+$path_sans:}$p"
done
if run_pre_commit PATH="$path_sans" HOME="$TMP/home-vide"; then
  ko "[pre-commit] gitleaks absent" "le commit a été accepté sans recherche de secrets"
elif grep -q 'tools/dev/setup.sh' "$TMP/err"; then
  ok "[pre-commit] gitleaks absent → refusé, mode d'emploi cité"
else
  ko "[pre-commit] gitleaks absent" "refusé sans citer tools/dev/setup.sh : $(first_line "$(cat "$TMP/err")")"
fi

# ---------------------------------------------------------------------------
# [pre-push] sans app/ : ne fait rien.
# ---------------------------------------------------------------------------
if (cd "$TMP/sur-branche" && printf '' | bash "$ROOT/.githooks/pre-push" origin https://example.invalid/x.git) >"$TMP/err" 2>&1; then
  ok "[pre-push] sans app/ → sortie 0"
else
  ko "[pre-push] sans app/" "$(first_line "$(cat "$TMP/err")")"
fi

# ---------------------------------------------------------------------------
# [garde-fou] : JSON fabriqués, comme Claude Code les envoie.
# ---------------------------------------------------------------------------
G_RC=0; G_OUT=""; G_ERR=""
garde_run() { # <cwd ou vide> <commande> [tool_name]
  local json
  json="$(python3 -c '
import json, sys
d = {"session_id": "test", "hook_event_name": "PreToolUse", "tool_name": sys.argv[3],
     "tool_input": {"command": sys.argv[2], "description": "test"}}
if sys.argv[1]:
    d["cwd"] = sys.argv[1]
print(json.dumps(d))' "$1" "$2" "${3:-Bash}")"
  G_OUT="$(printf '%s' "$json" | bash "$HOOK" 2>"$TMP/err")"; G_RC=$?
  G_ERR="$(cat "$TMP/err")"
}
classify() {
  if [ "$G_RC" -eq 2 ]; then echo DENY
  elif [ "$G_RC" -eq 0 ] && printf '%s' "$G_OUT" | grep -q '"permissionDecision": "ask"'; then echo ASK
  elif [ "$G_RC" -eq 0 ] && [ -z "$G_OUT" ]; then echo ALLOW
  else echo "ERREUR(code $G_RC)"
  fi
}
garde() { # <DENY|ASK|ALLOW> <nom> <cwd> <commande>
  local expected="$1" name="$2" got
  garde_run "$3" "$4"
  got="$(classify)"
  if [ "$got" = "$expected" ]; then
    ok "[garde-fou] $name → $expected" "$(first_line "${G_ERR:-$G_OUT}")"
  else
    ko "[garde-fou] $name" "attendu $expected, obtenu $got : $(first_line "${G_ERR:-$G_OUT}")"
  fi
}
M="$TMP/sur-main"
B="$TMP/sur-branche"

# Sur main : ce qui modifie main est bloqué, la lecture passe.
garde DENY  "commit sur main"                         "$M" 'git commit -m "docs(meta): x"'
garde DENY  "commit -q -m sur main"                   "$M" 'git commit -q -m "x"'
garde DENY  "merge sur main"                          "$M" 'git merge feat/x'
garde DENY  "rebase sur main"                         "$M" 'git rebase feat/x'
garde DENY  "cherry-pick sur main"                    "$M" 'git cherry-pick abc123'
garde DENY  "reset --hard sur main"                   "$M" 'git reset --hard HEAD~1'
garde DENY  "reset --soft sur main"                   "$M" 'git reset --soft HEAD~1'
garde DENY  "push sans refspec sur main"              "$M" 'git push'
garde DENY  "push origin HEAD sur main"               "$M" 'git push origin HEAD'
garde DENY  "push origin HEAD 2>&1 sur main"          "$M" 'git push origin HEAD 2>&1'
garde DENY  "pull --rebase sur main"                  "$M" 'git pull --rebase'
garde ALLOW "status sur main"                         "$M" 'git status'
garde ALLOW "log sur main"                            "$M" 'git log --oneline -5'
garde ALLOW "pull --ff-only sur main"                 "$M" 'git pull --ff-only origin main'
garde ALLOW "checkout -b depuis main"                 "$M" 'git checkout -b feat/x'
garde ALLOW "fetch sur main"                          "$M" 'git fetch origin'
garde ALLOW "diff sur main"                           "$M" 'git diff --stat'

# Partout : contournements et écritures dangereuses.
garde DENY  "push --force"                            "$B" 'git push --force origin feat/x'
garde DENY  "push --force-with-lease"                 "$B" 'git push --force-with-lease'
garde DENY  "push -f"                                 "$B" 'git push -f origin feat/x'
garde DENY  "push +main"                              "$B" 'git push origin +main'
garde DENY  "push HEAD:main"                          "$B" 'git push origin HEAD:main'
garde DENY  "push feat:main"                          "$B" 'git push origin feat/x:main'
garde DENY  "push origin main"                        "$B" 'git push origin main'
garde DENY  "push --delete"                           "$B" 'git push --delete origin feat/x'
garde DENY  "push --mirror"                           "$B" 'git push --mirror origin'
garde DENY  "commit --no-verify"                      "$B" 'git commit --no-verify -m "feat(T0.1): x"'
garde DENY  "commit -n"                               "$B" 'git commit -n -m "feat(T0.1): x"'
garde DENY  "commit -anm"                             "$B" 'git commit -anm "feat(T0.1): x"'
garde DENY  "-c core.hooksPath"                       "$B" 'git -c core.hooksPath=/dev/null commit -m "x"'
garde DENY  "-c core.hookspath (casse)"               "$B" 'git -c core.hookspath=x status'
garde DENY  "branch -D main"                          "$B" 'git branch -D main'
garde DENY  "branch -f main"                          "$B" 'git branch -f main HEAD~1'
garde DENY  "update-ref main"                         "$B" 'git update-ref refs/heads/main HEAD~1'
garde DENY  "filter-branch"                           "$B" 'git filter-branch --env-filter "x" -- --all'
garde DENY  "config core.hooksPath"                   "$B" 'git config core.hooksPath /dev/null'
garde DENY  "config alias"                            "$B" 'git config alias.st "push --force"'
garde DENY  "env GIT_DIR"                             "$B" 'env GIT_DIR=/x git status'
garde DENY  "variable comme commande"                 "$B" 'G=git; $G push --force'
garde DENY  "git -C vers un dépôt sur main"           "$B" "/usr/bin/git -C $M commit -m \"x\""
garde DENY  "cd vers un dépôt sur main"               "$B" "cd $M && git commit -m \"x\""
garde DENY  "cd hors dépôt puis commit"               "$B" 'cd .. && git commit -m "x"'
garde DENY  "cd dans un sous-shell puis commit"       "$M" "(cd $B) && git commit -m \"x\""
garde DENY  "gh api PUT contents"                     "$B" 'gh api -X PUT repos/x/y/contents/f -f message=x -f content=x'
garde DENY  "gh api PATCH git/refs"                   "$B" 'gh api -X PATCH repos/x/y/git/refs/heads/main -f sha=abc'
garde DENY  "gh api merges (corps)"                   "$B" 'gh api repos/x/y/merges -f base=main -f head=x'
garde DENY  "gh pr merge --squash"                    "$B" 'gh pr merge 3 --squash'
garde DENY  "gh pr merge --admin"                     "$B" 'gh pr merge 3 --admin'
garde DENY  "gh repo delete"                          "$B" 'gh repo delete Torof/flane --yes'
garde DENY  "redirection vers .githooks"              "$B" 'echo x > .githooks/pre-commit'
garde DENY  "redirection >> vers .claude"             "$B" 'echo x >> .claude/settings.json'
garde DENY  "sed -i sur le garde-fou"                 "$B" 'sed -i s/a/b/ .claude/hooks/garde-branche-main.sh'
garde DENY  "cp vers .githooks"                       "$B" 'cp x .githooks/pre-commit'
garde DENY  "rm -rf .claude"                          "$B" 'rm -rf .claude'
garde DENY  "rm -rf tools/dev"                        "$B" 'rm -rf tools/dev'
garde DENY  "tee vers settings.json"                  "$B" 'tee .claude/settings.json < x'
garde DENY  "mv .githooks"                            "$B" 'mv .githooks .githooks2'
garde DENY  "git checkout -- fichier protégé"         "$B" 'git checkout -- .claude/settings.json'
garde DENY  "git rm hook"                             "$B" 'git rm .githooks/pre-commit'
garde DENY  "git clean -fd"                           "$B" 'git clean -fd'
garde DENY  "git tag -d"                              "$B" 'git tag -d v0.0.1'
garde DENY  "sudo git"                                "$B" 'sudo git status'
garde DENY  "chmod 777 sur un hook"                   "$B" 'chmod 777 .githooks/pre-commit'
garde DENY  "python3 -c écrivant dans .claude"        "$B" 'python3 -c "open(\".claude/x\",\"w\")" .claude/x'

# Demandé : commandes indirectes et portes.
garde ASK   "bash -c git commit"                      "$B" 'bash -c "git commit -m x"'
garde ASK   "sh -c git push"                          "$B" "sh -c 'git push'"
garde ASK   "eval git push"                           "$B" 'eval "git push"'
garde ASK   "xargs git push"                          "$B" 'echo origin | xargs git push'
garde ASK   "substitution dans un push"               "$B" 'git push origin $(git branch --show-current)'
garde ASK   "gh pr merge"                             "$B" 'gh pr merge 3 --merge --delete-branch'
garde ASK   "gh repo edit"                            "$B" 'gh repo edit --visibility public'
garde ASK   "gh api PUT vulnerability-alerts"         "$B" 'gh api -X PUT repos/x/y/vulnerability-alerts'
garde ASK   "gh api POST rulesets"                    "$B" 'gh api -X POST repos/x/y/rulesets -f name=x'
garde ASK   "git config user.name"                    "$B" 'git config user.name x'
garde ASK   "git remote add"                          "$B" 'git remote add x https://example.invalid/x.git'

# Autorisé : travail normal sur une branche, lecture, scripts du projet.
garde ALLOW "commit sur une branche"                  "$B" 'git commit -m "feat(T0.1): x"'
garde ALLOW "commit heredoc contenant git commit"     "$B" "$(printf 'git commit -F - <<'"'"'EOF'"'"'\nfeat(T0.1): x\n\nNote: run git commit on main later\nEOF')"
garde ALLOW "message contenant && git commit"         "$B" 'git commit -m "echo a && git commit"'
garde ALLOW "echo contenant git commit"               "$B" 'echo "a && git commit"'
garde ALLOW "push -u origin branche"                  "$B" 'git push -u origin feat/T0.1-test'
garde ALLOW "push sans refspec sur une branche"       "$B" 'git push'
garde ALLOW "git add dans .claude"                    "$B" 'git add .claude/hooks/x.py'
garde ALLOW "update-index --chmod=+x"                 "$B" 'git update-index --chmod=+x tools/dev/setup.sh'
garde ALLOW "chmod +x sur un hook"                    "$B" 'chmod +x .githooks/pre-commit tools/dev/setup.sh'
garde ALLOW "cat settings.json"                       "$B" 'cat .claude/settings.json'
garde ALLOW "ls .claude"                              "$B" 'ls -la .claude'
garde ALLOW "grep -r dans .githooks"                  "$B" 'grep -rn foo .githooks'
garde ALLOW "sed -n (lecture) sur un hook"            "$B" 'sed -n 1,5p .githooks/pre-commit'
garde ALLOW "bash tools/dev/test-hooks.sh"            "$B" 'bash tools/dev/test-hooks.sh'
garde ALLOW "bash .githooks/commit-msg"               "$B" 'bash .githooks/commit-msg /tmp/m'
garde ALLOW "python3 -I sur le garde-fou"             "$B" 'python3 -I .claude/hooks/garde-branche-main.py < x.json'
garde ALLOW "cd sans git"                             "$B" 'cd app && npm test'
garde ALLOW "cd dans le dépôt puis commit"            "$B" "cd $B && git commit -m \"x\""
garde ALLOW "substitution sans git"                   "$B" 'echo $(date)'
garde ALLOW "git log | head"                          "$B" 'git log --format=%s | head -n 3'
garde ALLOW "git diff main...HEAD"                    "$B" 'git diff main...HEAD --stat'
garde ALLOW "checkout main"                           "$B" 'git checkout main'
garde ALLOW "branch --show-current"                   "$B" 'git branch --show-current'
garde ALLOW "fetch --prune"                           "$B" 'git fetch -q --prune'
garde ALLOW "gh pr view"                              "$B" 'gh pr view 1 --json state'
garde ALLOW "gh pr create --base main"                "$B" 'gh pr create --base main --title "x" --body "y"'
garde ALLOW "gh issue list"                           "$B" 'gh issue list --limit 10'
garde ALLOW "npm test"                                "$B" 'npm test'
garde ALLOW "find sans -exec"                         "$B" 'find . -name "*.md"'
garde ALLOW "mkdir docs"                              "$B" 'mkdir -p docs/tranches'
garde ALLOW "redirection vers docs"                   "$B" 'echo x > docs/x.md'
garde ALLOW "wc -l"                                   "$B" 'wc -l CLAUDE.md'
garde ALLOW "gitleaks git (sous-commande git)"        "$B" 'gitleaks git --no-banner --redact .'
garde ALLOW "commande multi-lignes sur branche"       "$B" "$(printf 'git add docs\ngit commit -m "docs(T0.1): x"\ngit push')"

# Cas spéciaux : entrée invalide, cwd absent, autre outil.
garde_run "" '{pas du json'
G_OUT="$(printf '{pas du json' | bash "$HOOK" 2>"$TMP/err")"; G_RC=$?; G_ERR="$(cat "$TMP/err")"
if [ "$G_RC" -eq 2 ]; then ok "[garde-fou] JSON invalide → DENY" "$(first_line "$G_ERR")"; else ko "[garde-fou] JSON invalide" "code $G_RC"; fi

(cd "$M" && garde_run "" 'git commit -m "x"'; [ "$(classify)" = DENY ]) && ok "[garde-fou] sans cwd, depuis main → DENY" || ko "[garde-fou] sans cwd, depuis main" "attendu DENY"
(cd "$B" && garde_run "" 'git commit -m "x"'; [ "$(classify)" = ALLOW ]) && ok "[garde-fou] sans cwd, depuis une branche → ALLOW" || ko "[garde-fou] sans cwd, depuis une branche" "attendu ALLOW"
(cd "$TMP" && CLAUDE_PROJECT_DIR="$M" garde_run "" 'git commit -m "x"'; [ "$(classify)" = DENY ]) && ok "[garde-fou] sans cwd, CLAUDE_PROJECT_DIR sur main → DENY" || ko "[garde-fou] sans cwd, CLAUDE_PROJECT_DIR sur main" "attendu DENY"
garde ALLOW "premier commit d'un dépôt vide"          "$TMP/depot-vide" 'git commit -m "docs: starter kit"'
garde DENY  "cwd inexistant"                          "$TMP/nexiste-pas" 'git commit -m "x"'
garde DENY  "cwd hors dépôt"                          "$TMP/pas-un-depot" 'git commit -m "x"'
garde_run "$M" 'git commit -m "x"' Read
if [ "$G_RC" -eq 0 ] && [ -z "$G_OUT" ]; then ok "[garde-fou] autre outil que Bash → ignoré"; else ko "[garde-fou] autre outil que Bash" "code $G_RC : $(first_line "$G_ERR")"; fi

# ---------------------------------------------------------------------------
printf '\n%d réussis, %d échoués\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
