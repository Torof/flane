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
nouveau_depot "$TMP/avec-hooks" "feat/T0.1-test"
git -C "$TMP/avec-hooks" config core.hooksPath "$ROOT/.githooks"
mkdir -p "$TMP/pas-un-depot" "$TMP/home-vide" "$TMP/depot-vide"
git -C "$TMP/depot-vide" init -q -b main   # aucun commit : branche « non née »
# sur-branche : main porte un garde-fou versionné (commit 2) ; la branche ajoute
# un fichier ordinaire (commit 3). HEAD~2 n'a pas de garde-fou : retour en arrière.
nouveau_depot "$TMP/sur-branche"
mkdir -p "$TMP/sur-branche/.claude/hooks" "$TMP/sur-branche/.githooks" "$TMP/sur-branche/docs"
printf '#!/bin/sh\nexit 0\n' >"$TMP/sur-branche/.claude/hooks/garde-branche-main.sh"
git -C "$TMP/sur-branche" add .claude
git -C "$TMP/sur-branche" commit -q -m "chore(T0.1): guard"
git -C "$TMP/sur-branche" checkout -q -b "feat/T0.1-test"
printf 'x\n' >"$TMP/sur-branche/fichier-suivi.txt"
git -C "$TMP/sur-branche" add fichier-suivi.txt
git -C "$TMP/sur-branche" commit -q -m "chore(T0.1): file"

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

if bash "$ROOT/.githooks/commit-msg" "$TMP/fichier-absent" >/dev/null 2>&1; then
  ko "[commit-msg] fichier de message absent" "accepté"
else
  ok "[commit-msg] fichier de message absent → refusé"
fi
: >"$TMP/msg-vide"
if bash "$ROOT/.githooks/commit-msg" "$TMP/msg-vide" >/dev/null 2>&1; then
  ko "[commit-msg] fichier de message vide" "accepté"
else
  ok "[commit-msg] fichier de message vide → refusé"
fi

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

run_pre_commit() { # [VAR=valeur…] ; sortie dans $TMP/err ; code dans $?
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

# Configuration gitleaks fournie par le dépôt : refusée.
printf 'x\n' >"$TMP/avec-hooks/.gitleaksignore"
git -C "$TMP/avec-hooks" add .gitleaksignore
if run_pre_commit X=1; then
  ko "[pre-commit] .gitleaksignore indexé" "accepté : la recherche de secrets pourrait être neutralisée"
elif grep -qi 'configuration gitleaks' "$TMP/err"; then
  ok "[pre-commit] .gitleaksignore indexé → refusé"
else
  ko "[pre-commit] .gitleaksignore indexé" "refusé pour une autre raison : $(first_line "$(cat "$TMP/err")")"
fi
git -C "$TMP/avec-hooks" rm -q --cached .gitleaksignore
rm -f "$TMP/avec-hooks/.gitleaksignore"

# Annotation d'exception gitleaks ajoutée dans du code : refusée.
printf 'token = "none" # gitleaks:%s\n' "allow" >"$TMP/avec-hooks/annot.txt"
git -C "$TMP/avec-hooks" add annot.txt
if run_pre_commit X=1; then
  ko "[pre-commit] annotation d'exception dans le code" "acceptée"
elif grep -q "annotation d'exception" "$TMP/err"; then
  ok "[pre-commit] annotation d'exception dans le code → refusée"
else
  ko "[pre-commit] annotation d'exception dans le code" "refusée pour une autre raison : $(first_line "$(cat "$TMP/err")")"
fi
git -C "$TMP/avec-hooks" rm -q --cached annot.txt
rm -f "$TMP/avec-hooks/annot.txt"

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

# gitleaks en panne (code 3, aucun rapport) : refus par doute.
mkdir -p "$TMP/fakebin"
cat >"$TMP/fakebin/gitleaks" <<'EOF'
#!/bin/sh
if [ "$1" = "version" ]; then echo 8.30.1; exit 0; fi
echo "boom" >&2
exit 3
EOF
chmod +x "$TMP/fakebin/gitleaks"
if run_pre_commit PATH="$TMP/fakebin:$path_sans" HOME="$TMP/home-vide"; then
  ko "[pre-commit] gitleaks en panne" "le commit a été accepté"
elif grep -q 'doute' "$TMP/err"; then
  ok "[pre-commit] gitleaks en panne → refusé par doute"
else
  ko "[pre-commit] gitleaks en panne" "refusé sans mentionner le doute : $(first_line "$(cat "$TMP/err")")"
fi

# La version attendue est la même dans le hook et dans setup.sh.
v_hook="$(grep -E '^EXPECTED_VERSION=' "$ROOT/.githooks/pre-commit" | cut -d'"' -f2)"
v_setup="$(grep -E '^GITLEAKS_VERSION=' "$ROOT/tools/dev/setup.sh" | cut -d'"' -f2)"
if [ -n "$v_hook" ] && [ "$v_hook" = "$v_setup" ]; then
  ok "[pre-commit] version gitleaks cohérente avec setup.sh ($v_hook)"
else
  ko "[pre-commit] version gitleaks" "hook : ${v_hook:-?}, setup.sh : ${v_setup:-?}"
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
# [kit] : les réglages de Claude Code protègent les garde-fous, la liste
# « allow » est exactement celle décidée (T0.1b), le kit est cohérent.
# ---------------------------------------------------------------------------
if python3 -I - "$ROOT" <<'PY' 2>"$TMP/err"
import json, os, re, sys
root = sys.argv[1]
with open(os.path.join(root, ".claude/settings.json"), encoding="utf-8") as f:
    s = json.load(f)
perms = s["permissions"]
if perms.get("defaultMode") != "acceptEdits":
    sys.exit("defaultMode doit être acceptEdits (D-020)")
ask = set(perms["ask"])
needed = {f"{tool}(./{path}/**)" for tool in ("Edit", "Write") for path in (".claude", ".githooks", ".github", "tools/dev")}
needed |= {f"{tool}(./{path})" for tool in ("Edit", "Write") for path in ("CLAUDE.md", ".gitignore", ".mcp.json")}
missing = needed - ask
if missing:
    sys.exit("ask : manquent " + ", ".join(sorted(missing)))
# Liste figée (T0.1b) : toute modification passe par une tranche et par ce banc.
expected_allow = [
    "Bash(git status:*)", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git show:*)",
    "Bash(git branch --show-current)", "Bash(git branch -a)", "Bash(git branch --list:*)",
    "Bash(git rev-parse:*)", "Bash(git ls-files:*)", "Bash(git merge-base:*)", "Bash(git remote -v)",
    "Bash(git fetch:*)", "Bash(git stash list)", "Bash(git add:*)", "Bash(git commit:*)",
    "Bash(git push:*)", "Bash(git switch:*)",
    "Bash(gh pr view:*)", "Bash(gh pr list:*)", "Bash(gh pr create:*)", "Bash(gh pr checks:*)",
    "Bash(gh issue list:*)", "Bash(gh run list:*)", "Bash(gh repo view:*)", "Bash(gh label list:*)",
    "Bash(bash tools/dev/test-hooks.sh:*)", "Bash(bash tools/dev/setup.sh)",
]
if perms.get("allow") != expected_allow:
    sys.exit("allow : différente de la liste figée du banc")
forbidden = re.compile(r"\b(gh api|gh pr merge|rm|sudo|curl|wget|--force|gh issue view)\b")
for entry in expected_allow:
    if forbidden.search(entry):
        sys.exit(f"allow : motif interdit dans {entry}")
hooks = s["hooks"]["PreToolUse"][0]
assert hooks["matcher"] == "Bash"
assert "garde-branche-main.sh" in hooks["hooks"][0]["command"]
local = os.path.join(root, ".claude/settings.local.json")
if os.path.exists(local):
    with open(local, encoding="utf-8") as f:
        l = json.load(f)
    bad = [e for e in l.get("permissions", {}).get("allow", []) if e.startswith("Bash(")]
    if bad:
        sys.exit("settings.local.json : règles Bash hors du kit : " + ", ".join(bad))
# Compétences et agents cités dans CLAUDE.md existent.
with open(os.path.join(root, "CLAUDE.md"), encoding="utf-8") as f:
    claude_md = f.read()
builtin = {"clear", "compact", "insights", "rewind", "help", "config", "fast", "code-review"}
for skill in re.findall(r"`/([a-z-]+)`", claude_md):
    if skill not in builtin and not os.path.exists(os.path.join(root, ".claude/skills", skill, "SKILL.md")):
        sys.exit(f"compétence citée sans fichier : /{skill}")
for agent in ("avocat-du-diable", "auditeur-securite", "relecteur"):
    if agent not in claude_md or not os.path.exists(os.path.join(root, ".claude/agents", agent + ".md")):
        sys.exit(f"agent manquant : {agent}")
PY
then
  ok "[kit] settings.json : acceptEdits, ask sur les garde-fous, allow figée, hook branché ; compétences et agents présents"
else
  ko "[kit] réglages de Claude Code" "$(first_line "$(cat "$TMP/err")")"
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
garde DENY  "bash heredoc qui commite sur main"       "$M" "$(printf "bash <<'EOF'\ngit commit -m x\nEOF")"
garde ALLOW "status sur main"                         "$M" 'git status'
garde ALLOW "log sur main"                            "$M" 'git log --oneline -5'
garde ALLOW "pull --ff-only sur main"                 "$M" 'git pull --ff-only origin main'
garde ALLOW "checkout -b depuis main"                 "$M" 'git checkout -b feat/x'
garde ALLOW "checkout -b puis commit"                 "$M" 'git checkout -q -b feat/y && git commit -m "feat(T0.1): x"'
garde ALLOW "fetch sur main"                          "$M" 'git fetch origin'
garde ALLOW "diff sur main"                           "$M" 'git diff --stat'

# Changement de branche dans la même commande : suivi.
garde DENY  "checkout main puis commit"               "$B" 'git checkout main && git commit -am "x"'
garde DENY  "switch main puis merge"                  "$B" 'git switch main; git merge feat/x'
garde DENY  "switch main puis push HEAD"              "$B" 'git switch main && git push origin HEAD'
garde DENY  "switch - puis commit"                    "$B" 'git switch - && git commit -m "x"'

# Partout : contournements et écritures dangereuses.
garde ASK   "push --force (exception demandée)"       "$B" 'git push --force origin feat/x'
garde ASK   "push --force-with-lease"                 "$B" 'git push --force-with-lease'
garde ASK   "push --force-w (abrégé)"                 "$B" 'git push --force-w origin feat/x'
garde ASK   "push -f"                                 "$B" 'git push -f origin feat/x'
garde ASK   "push -fn"                                "$B" 'git push -fn origin feat/x'
garde ASK   "push +main"                              "$B" 'git push origin +main'
garde ASK   "push --force origin main"                "$B" 'git push --force origin main'
garde DENY  "push HEAD:main"                          "$B" 'git push origin HEAD:main'
garde DENY  "push feat:main"                          "$B" 'git push origin feat/x:main'
garde DENY  "push origin main"                        "$B" 'git push origin main'
garde DENY  "push --delete"                           "$B" 'git push --delete origin feat/x'
garde DENY  "push --del (abrégé)"                     "$B" 'git push --del origin feat/x'
garde DENY  "push -d"                                 "$B" 'git push -d origin feat/x'
garde DENY  "push --mirror"                           "$B" 'git push --mirror origin'
garde DENY  "commit --no-verify"                      "$B" 'git commit --no-verify -m "feat(T0.1): x"'
garde DENY  "commit --no-veri (abrégé)"               "$B" 'git commit --no-veri -m "feat(T0.1): x"'
garde DENY  "merge --no-verif (abrégé)"               "$B" 'git merge --no-verif feat/x'
garde DENY  "commit -n"                               "$B" 'git commit -n -m "feat(T0.1): x"'
garde DENY  "commit -anm"                             "$B" 'git commit -anm "feat(T0.1): x"'
garde DENY  "-c core.hooksPath"                       "$B" 'git -c core.hooksPath=/dev/null commit -m "x"'
garde DENY  "-c core.hookspath (casse)"               "$B" 'git -c core.hookspath=x status'
garde DENY  "branch -D main"                          "$B" 'git branch -D main'
garde DENY  "branch -f main"                          "$B" 'git branch -f main HEAD~1'
garde DENY  "update-ref main"                         "$B" 'git update-ref refs/heads/main HEAD~1'
garde DENY  "filter-branch"                           "$B" 'git filter-branch --env-filter "x" -- --all'
garde DENY  "config core.hooksPath"                   "$B" 'git config core.hooksPath /dev/null'
garde DENY  "config --file .git/config"               "$B" 'git config --file .git/config core.hooksPath x'
garde DENY  "config set core.hooksPath"               "$B" 'git config set core.hooksPath x'
garde DENY  "config alias"                            "$B" 'git config alias.st "push --force"'
garde DENY  "env GIT_DIR"                             "$B" 'env GIT_DIR=/x git status'
garde DENY  "export GIT_CONFIG_* puis commit"         "$B" 'export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null; git commit -m "x"'
garde DENY  "export GIT_DIR puis commit"              "$B" 'export GIT_DIR=../autre/.git; git commit -m "x"'
garde DENY  "redirection vers .git/config"            "$B" 'echo "[core]" >> .git/config'
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
garde DENY  "redirection vers .github"                "$B" 'echo x > .github/workflows/ci.yml'
garde DENY  "redirection vers chemin dynamique"       "$B" 'D=.githooks; echo x > $D/pre-commit'
garde DENY  "cd .githooks puis écriture"              "$B" 'cd .githooks && echo x > pre-commit'
garde DENY  "tee avec accolades"                      "$B" 'tee .githoo{ks,}/pre-commit'
garde DENY  "sed -i sur le garde-fou"                 "$B" 'sed -i s/a/b/ .claude/hooks/garde-branche-main.sh'
garde DENY  "sed w vers .githooks"                    "$B" "sed -n 'w .githooks/x' f"
garde DENY  "awk écrivant dans .githooks"             "$B" "awk 'BEGIN{print 1 > \".githooks/pre-commit\"}'"
garde DENY  "sort -o vers .githooks"                  "$B" 'sort -o .githooks/pre-commit x'
garde DENY  "find -fprint vers .githooks"             "$B" 'find . -fprint .githooks/x'
garde DENY  "cp vers .githooks"                       "$B" 'cp x .githooks/pre-commit'
garde DENY  "cp vers chemin dynamique"                "$B" 'cp x "$D/pre-commit"'
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
garde DENY  "bash avec script dynamique"              "$B" 'bash "$HOOK"'

# Dérivés dangereux des préfixes « allow » (T0.1b) : jamais silencieux.
garde DENY  "git diff --output vers le garde-fou"     "$B" 'git diff --no-index a b --output=.claude/hooks/garde-branche-main.sh'
garde DENY  "git log --output"                        "$B" 'git log --output=/tmp/x'
garde DENY  "git log -o"                              "$B" 'git log -o /tmp/x'
garde DENY  "git fetch --upload-pack"                 "$B" "git fetch --upload-pack='sh -c x' ."
garde DENY  "git ls-remote --upload-pack"             "$B" "git ls-remote --upload-pack='sh -c x' ."
garde ASK   "git checkout vers un commit aux garde-fous différents" "$B" 'git checkout HEAD~2'
garde ASK   "git checkout -- chemins"                 "$B" 'git checkout -- app/'
garde ASK   "git checkout fichier suivi"              "$B" 'git checkout fichier-suivi.txt'
garde ASK   "git switch --discard-changes"            "$B" 'git switch --discard-changes feat/T0.1-test'
garde ASK   "git checkout -f"                         "$B" 'git checkout -f feat/T0.1-test'
garde ASK   "git branch -D autre branche"             "$B" 'git branch -D feat/x'
garde ASK   "git branch -m"                           "$B" 'git branch -m feat/x feat/y'
garde ASK   "git push vers un autre dépôt distant"    "$B" 'git push https://example.invalid/x.git HEAD:x'
garde ASK   "git gc"                                  "$B" 'git gc --prune=now'
garde ASK   "git reflog expire"                       "$B" 'git reflog expire --expire=now --all'
garde ASK   "git stash drop"                          "$B" 'git stash drop'
garde ASK   "gh pr create --body-file hors brouillon" "$B" 'gh pr create --title x --body-file ~/.config/gh/hosts.yml'
garde ASK   "gh pr create -F .env"                    "$B" 'gh pr create --title x -F .env'
garde ASK   "gh issue create --body-file hors brouillon" "$B" 'gh issue create --title x --body-file docs/x.md'
garde ASK   "rg --pre"                                "$B" 'rg --pre sh x f'
garde ASK   "find -delete"                            "$B" 'find docs -name "*.md" -delete'
garde ASK   "redirection hors du projet"              "$B" 'echo x > ~/.gitconfig'
garde DENY  "tree -o vers .githooks"                  "$B" 'tree -o .githooks/x'
garde ALLOW "gh pr create --body-file depuis le brouillon" "$B" 'gh pr create --title x --body-file /tmp/claude-1000/x/body.md'
garde ALLOW "git checkout branche aux mêmes garde-fous" "$B" 'git checkout feat/T0.1-test'
garde ALLOW "git switch -c"                           "$B" 'git switch -c feat/T0.1b-x'
garde ALLOW "git reflog (liste)"                      "$B" 'git reflog -5'
garde ALLOW "git stash list"                          "$B" 'git stash list'
garde ALLOW "redirection vers le brouillon"           "$B" 'echo x > /tmp/claude-1000/x/out.txt'
garde ALLOW "redirection vers /dev/null"              "$B" 'git status > /dev/null'

# Demandé : commandes indirectes, scripts externes et portes.
garde ASK   "bash -c git commit"                      "$B" 'bash -c "git commit -m x"'
garde ASK   "sh -c git push"                          "$B" "sh -c 'git push'"
garde ASK   "eval git push"                           "$B" 'eval "git push"'
garde ASK   "xargs git push"                          "$B" 'echo origin | xargs git push'
garde ASK   "substitution dans un push"               "$B" 'git push origin $(git branch --show-current)'
garde ASK   "python3 -c mentionnant .githooks"        "$B" "python3 -c \"open('.githooks/pre-commit','w')\""
garde ASK   "python3 heredoc avec git"                "$M" "$(printf "python3 - <<'EOF'\nimport subprocess; subprocess.run([\"git\",\"commit\"])\nEOF")"
garde ASK   "awk system(git)"                         "$B" "awk 'BEGIN{system(\"git commit -m x\")}'"
garde ASK   "bash script hors projet"                 "$B" 'bash /tmp/x.sh'
garde ASK   "bash lisant un fichier"                  "$B" 'bash < /tmp/x.sh'
garde ASK   "gh pr merge"                             "$B" 'gh pr merge 3 --merge --delete-branch'
garde ASK   "gh repo edit"                            "$B" 'gh repo edit --visibility public'
garde ASK   "gh repo sync --force"                    "$B" 'gh repo sync --force'
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
garde ALLOW "push -n (dry-run) sur une branche"       "$B" 'git push -n origin feat/x'
garde ALLOW "git add dans .claude"                    "$B" 'git add .claude/hooks/x.py'
garde ALLOW "git remote -v"                           "$B" 'git remote -v'
garde ALLOW "update-index --chmod=+x"                 "$B" 'git update-index --chmod=+x tools/dev/setup.sh'
garde ALLOW "chmod +x sur un hook"                    "$B" 'chmod +x .githooks/pre-commit tools/dev/setup.sh'
garde ALLOW "cat settings.json"                       "$B" 'cat .claude/settings.json'
garde ALLOW "ls .claude"                              "$B" 'ls -la .claude'
garde ALLOW "grep -r dans .githooks"                  "$B" 'grep -rn foo .githooks'
garde ALLOW "sed -n (lecture) sur un hook"            "$B" 'sed -n 1,5p .githooks/pre-commit'
garde ALLOW "awk lecture"                             "$B" "awk '{print \$1}' docs/x.md"
garde ALLOW "sort lecture"                            "$B" 'sort docs/x.md'
garde ALLOW "bash tools/dev/test-hooks.sh"            "$B" 'bash tools/dev/test-hooks.sh -v'
garde ALLOW "bash .githooks/commit-msg"               "$B" 'bash .githooks/commit-msg /tmp/m'
garde ALLOW "bash -n (syntaxe) sur un hook"           "$B" 'bash -n .githooks/pre-commit'
garde ALLOW "python3 -I sur le garde-fou"             "$B" 'python3 -I .claude/hooks/garde-branche-main.py < x.json'
garde ALLOW "python3 heredoc sans git"                "$B" "$(printf "python3 - <<'EOF'\nprint(1)\nEOF")"
garde ALLOW "cd sans git"                             "$B" 'cd docs && npm test'
garde ALLOW "cd docs puis écriture"                   "$B" 'cd docs && echo x > x.md'
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

# Cas spéciaux : entrée invalide, cwd absent, dépôt vide, autre outil.
G_OUT="$(printf '{pas du json' | bash "$HOOK" 2>"$TMP/err")"; G_RC=$?; G_ERR="$(cat "$TMP/err")"
if [ "$G_RC" -eq 2 ]; then ok "[garde-fou] JSON invalide → DENY" "$(first_line "$G_ERR")"; else ko "[garde-fou] JSON invalide" "code $G_RC"; fi

sans_cwd() { # <nom> <attendu> <dossier> <commande> [VAR=valeur]
  local name="$1" expected="$2" dir="$3" cmd="$4" var="${5:-}" got
  got="$(cd "$dir" && { [ -n "$var" ] && export "$var"; garde_run "" "$cmd"; classify; })"
  if [ "$got" = "$expected" ]; then
    ok "[garde-fou] $name → $expected"
  else
    ko "[garde-fou] $name" "attendu $expected, obtenu $got"
  fi
}
sans_cwd "sans cwd, depuis main"                     DENY  "$M"   'git commit -m "x"'
sans_cwd "sans cwd, depuis une branche"              ALLOW "$B"   'git commit -m "x"'
sans_cwd "sans cwd, CLAUDE_PROJECT_DIR sur main"     DENY  "$TMP" 'git commit -m "x"' "CLAUDE_PROJECT_DIR=$M"
garde ALLOW "premier commit d'un dépôt vide"          "$TMP/depot-vide" 'git commit -m "docs: starter kit"'
garde DENY  "cwd inexistant"                          "$TMP/nexiste-pas" 'git commit -m "x"'
garde DENY  "cwd hors dépôt"                          "$TMP/pas-un-depot" 'git commit -m "x"'
garde_run "$M" 'git commit -m "x"' Read
if [ "$G_RC" -eq 0 ] && [ -z "$G_OUT" ]; then ok "[garde-fou] autre outil que Bash → ignoré"; else ko "[garde-fou] autre outil que Bash" "code $G_RC : $(first_line "$G_ERR")"; fi

# ---------------------------------------------------------------------------
printf '\n%d réussis, %d échoués\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
