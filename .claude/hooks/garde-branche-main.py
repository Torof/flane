#!/usr/bin/env python3
"""Garde-fou Flâne : analyse l'appel Bash de Claude Code (JSON sur l'entrée standard).

Sortie 2 avec un message sur stderr : appel bloqué.
Sortie 0 sans sortie : appel autorisé.
Sortie 0 avec un JSON sur stdout : demande de confirmation à l'utilisateur.

Règle absolue : en cas de doute, on bloque. Un faux positif se corrige en
reformulant la commande ; un faux négatif laisserait passer une modification
de main ou un contournement des hooks. Le script est appelé par
garde-branche-main.sh, qui convertit toute panne en blocage.

Bibliothèque standard seulement. Testé par tools/dev/test-hooks.sh.
"""

import fnmatch
import json
import os
import posixpath
import re
import shlex
import subprocess
import sys

ALLOW, ASK, DENY = "ALLOW", "ASK", "DENY"


class Decision(Exception):
    """Une décision prise sur un segment de commande."""

    def __init__(self, kind, msg):
        super().__init__(msg)
        self.kind = kind
        self.msg = msg


# ---------------------------------------------------------------------------
# Heredocs : retirés avant la tokenisation. Un corps à délimiteur cité est une
# donnée pure (jamais analysée) ; un corps à délimiteur non cité subit
# l'expansion bash, il est donc réinjecté pour la détection de substitution.
# ---------------------------------------------------------------------------
HEREDOC_RE = re.compile(r"<<-?\s*(?P<q>['\"]?)\\?(?P<d>[A-Za-z_][A-Za-z0-9_]*)(?P=q)")


def strip_heredocs(cmd):
    lines = cmd.split("\n")
    out, bodies, i = [], [], 0
    while i < len(lines):
        line = lines[i]
        m = HEREDOC_RE.search(line)
        if m and not line[m.start():].startswith("<<<"):
            if len(HEREDOC_RE.findall(line)) > 1:
                raise Decision(DENY, "plusieurs heredocs sur une même ligne (doute)")
            after = line[m.start() + 2:].lstrip("-").lstrip()
            quoted = bool(m.group("q")) or after.startswith("\\")
            delim = m.group("d")
            dash = line[m.start():].startswith("<<-")
            out.append(line[:m.start()] + " __HEREDOC__ " + line[m.end():])
            body = []
            i += 1
            while i < len(lines):
                candidate = lines[i].lstrip("\t") if dash else lines[i]
                if candidate == delim:
                    break
                body.append(lines[i])
                i += 1
            else:
                raise Decision(DENY, "heredoc non terminé")
            bodies.append((quoted, "\n".join(body)))
        else:
            out.append(line)
        i += 1
    return "\n".join(out), bodies


# ---------------------------------------------------------------------------
# Tokenisation, segments, redirections.
# ---------------------------------------------------------------------------
SEP_RE = re.compile(r"^[;&|\n()]+$")
REDIR_RE = re.compile(r"^(&>>?|>[>|&]?|<[&>]?|<<<)$")
KEYWORDS = {"if", "then", "else", "elif", "fi", "while", "until", "do", "done", "{", "}", "!", "time"}


def tokenize(text):
    text = text.replace("\\\n", " ")
    lexer = shlex.shlex(text, posix=True, punctuation_chars="();<>|&\n")
    lexer.whitespace_split = True
    lexer.whitespace = " \t\r"
    try:
        return list(lexer)
    except ValueError as exc:
        raise Decision(DENY, f"commande non analysable ({exc})")


def split_segments(tokens):
    """Découpe sur && || ; | |& & saut de ligne ( ). Renvoie aussi si un sous-shell apparaît."""
    segments, subshell = [[]], False
    for tok in tokens:
        if SEP_RE.fullmatch(tok) and not any(c in tok for c in "<>"):
            if "(" in tok or ")" in tok:
                subshell = True
            if segments[-1]:
                segments.append([])
        else:
            segments[-1].append(tok)
    return [s for s in segments if s], subshell


def extract_redirs(segment):
    """Sépare les mots des redirections. Renvoie (mots, cibles écrites)."""
    words, writes, i = [], [], 0
    while i < len(segment):
        tok = segment[i]
        if REDIR_RE.fullmatch(tok):
            if words and words[-1].isdigit():
                words.pop()
            target = segment[i + 1] if i + 1 < len(segment) else ""
            if ">" in tok and not tok.startswith("<") and target and not target.isdigit() and target != "-":
                writes.append(target)
            i += 2
            continue
        words.append(tok)
        i += 1
    return words, writes


# ---------------------------------------------------------------------------
# Chemins protégés : les garde-fous eux-mêmes ne se modifient que par les
# outils Edit et Write de Claude Code, soumis à une demande (settings.json).
# ---------------------------------------------------------------------------
PROTECTED = ((".claude",), (".githooks",), ("tools", "dev"))


def is_protected(tok, cwd, roots):
    for part in tok.split("="):
        if not part:
            continue
        path = os.path.expanduser(part.replace("\\", "/"))
        absolute = posixpath.normpath(path if posixpath.isabs(path) else posixpath.join(cwd, path))
        comps = [c for c in absolute.split("/") if c]
        if ".claude" in comps or ".githooks" in comps:
            return True
        for root in roots:
            root_comps = [c for c in posixpath.normpath(root).split("/") if c]
            if comps[:len(root_comps)] != root_comps:
                continue
            rel = comps[len(root_comps):]
            for pattern in PROTECTED:
                n = min(len(rel), len(pattern))
                if all(fnmatch.fnmatch(pattern[k], rel[k]) for k in range(n)):
                    return True
    return False


# ---------------------------------------------------------------------------
# Préfixes : affectations, env, command, nohup, nice, timeout.
# ---------------------------------------------------------------------------
ASSIGN_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
DURATION_RE = re.compile(r"^\d+(\.\d+)?[smhd]?$")
ENV_OK = {
    "GIT_PAGER", "PAGER", "GIT_TERMINAL_PROMPT", "GIT_EDITOR", "EDITOR", "LANG", "LC_ALL",
    "LC_MESSAGES", "TZ", "NO_COLOR", "CLICOLOR", "GH_PAGER", "GH_NO_UPDATE_NOTIFIER",
    "GH_PROMPT_DISABLED", "GIT_OPTIONAL_LOCKS", "GIT_TRACE", "FORCE_COLOR",
    "FILTER_BRANCH_SQUELCH_WARNING",
}


def strip_prefixes(words):
    envs, i = [], 0
    while i < len(words):
        w = words[i]
        if ASSIGN_RE.match(w):
            envs.append(w.split("=", 1)[0])
            i += 1
            continue
        base = os.path.basename(w)
        if base == "env":
            i += 1
            if i < len(words) and words[i].startswith("-"):
                raise Decision(DENY, f"option de env non reconnue : {words[i]} (doute)")
            continue
        if base in ("command", "nohup", "nice"):
            i += 1
            continue
        if base == "timeout":
            i += 1
            while i < len(words) and not DURATION_RE.match(words[i]):
                i += 1
            i += 1
            continue
        break
    return words[i:], envs


# ---------------------------------------------------------------------------
# Lecture de la branche : seul effet de bord, borné dans le temps.
# ---------------------------------------------------------------------------
def git_run(repo, *args):
    try:
        result = subprocess.run(
            ["git", "-C", repo, *args], capture_output=True, text=True, timeout=5,
            env={**os.environ, "GIT_OPTIONAL_LOCKS": "0", "LC_ALL": "C"},
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    return result.stdout.strip() if result.returncode == 0 else None


class Ctx:
    def __init__(self, cwd, roots):
        self.cwd = cwd
        self.roots = set(roots)
        self.cache = {}

    def branch(self, repo):
        repo = posixpath.normpath(repo)
        if repo not in self.cache:
            if not os.path.isdir(repo):
                raise Decision(DENY, f"dossier introuvable : {repo}")
            branch = git_run(repo, "rev-parse", "--abbrev-ref", "HEAD")
            if branch is None:
                raise Decision(DENY, "pas un dépôt git, ou git indisponible (doute)")
            if branch == "HEAD":
                raise Decision(DENY, "HEAD détaché : la branche est inconnue (doute)")
            self.cache[repo] = branch
        return self.cache[repo]

    def upstream_is_main(self, repo):
        upstream = git_run(repo, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}") or ""
        push_default = git_run(repo, "config", "--get", "push.default") or ""
        return upstream.endswith("/main") or push_default == "matching"

    def change_dir(self, target):
        new = posixpath.normpath(os.path.expanduser(target) if posixpath.isabs(os.path.expanduser(target))
                                 else posixpath.join(self.cwd, os.path.expanduser(target)))
        if not os.path.isdir(new):
            raise Decision(DENY, f"cd vers un dossier introuvable ({target}) : la branche ne peut plus être vérifiée")
        self.cwd = new
        top = git_run(new, "rev-parse", "--show-toplevel")
        if top:
            self.roots.add(top)


# ---------------------------------------------------------------------------
# Règles git.
# ---------------------------------------------------------------------------
CONFIG_KEY_OK = re.compile(
    r"^(color\..*|core\.pager|core\.editor|core\.quotepath|commit\.gpgsign|gpg\..*|"
    r"user\.(name|email)|advice\..*|pager\..*|safe\.directory)$", re.I)
CONFIG_KEY_DENY = re.compile(
    r"^(core\.hookspath|alias\.|include|url\.|credential|core\.sshcommand|core\.gitproxy|"
    r"core\.fsmonitor|core\.editor|core\.pager|diff\..*\.command|diff\.external|"
    r"merge\..*\.driver|filter\.|remote\.|push\.|receive\.|safe\.)", re.I)
GLOBAL_OK = {
    "--no-pager", "-p", "--paginate", "--no-optional-locks", "--literal-pathspecs",
    "--glob-pathspecs", "--noglob-pathspecs", "--icase-pathspecs", "--no-replace-objects",
    "--no-advice", "--no-lazy-fetch",
}
READ_ONLY_SUB = {
    "status", "log", "diff", "show", "blame", "rev-parse", "ls-files", "ls-tree", "cat-file",
    "describe", "shortlog", "grep", "for-each-ref", "name-rev", "count-objects", "fsck", "help",
    "version", "check-ignore", "ls-remote", "merge-base", "rev-list", "diff-tree", "whatchanged",
    "reflog", "stash", "add", "fetch", "worktree", "tag", "notes", "init", "clone", "mv", "rm",
    "restore", "checkout", "switch", "clean", "apply", "bisect", "remote", "config", "branch",
    "show-ref", "var", "check-attr", "archive", "bundle", "range-diff", "cherry", "format-patch",
    "submodule", "gc", "prune", "maintenance",
}
MAIN_SENSITIVE = {"commit", "merge", "rebase", "cherry-pick", "am", "revert", "reset", "pull"}
ALWAYS_DENY_SUB = {"update-ref", "filter-branch", "filter-repo", "replace", "symbolic-ref"}
TREE_WRITERS = {"checkout", "restore", "clean", "rm", "mv", "apply", "stash", "clone", "init",
                "worktree", "submodule", "archive"}
BRANCH_LISTING = {
    "-a", "-r", "-v", "-vv", "--list", "--contains", "--merged", "--no-merged", "--show-current",
    "--format", "--sort", "--points-at", "--column", "--color", "--no-color", "--all", "--remotes",
}
MAIN_REFS = ("main", "refs/heads/main")


def analyse_git(words, ctx):
    repo, i = ctx.cwd, 1
    while i < len(words) and words[i].startswith("-"):
        w = words[i]
        if w == "-C":
            i += 1
            path = words[i] if i < len(words) else ""
            repo = path if os.path.isabs(path) else os.path.join(repo, path)
        elif w == "-c" or (w.startswith("-c") and "=" in w):
            if w == "-c":
                i += 1
                kv = words[i] if i < len(words) else ""
            else:
                kv = w[2:]
            key = kv.split("=", 1)[0].lower()
            if key == "core.hookspath" or key.startswith("alias."):
                raise Decision(DENY, f"option -c {key} : contournement des hooks ou alias")
            if not CONFIG_KEY_OK.match(key):
                raise Decision(DENY, f"option -c {key} non reconnue (doute)")
        elif w in GLOBAL_OK:
            pass
        elif w in ("--help", "--version", "-h"):
            return
        else:
            raise Decision(DENY, f"option globale de git non reconnue : {w} (doute)")
        i += 1
    if i >= len(words):
        return
    sub, args = words[i], words[i + 1:]
    positionals = [a for a in args if not a.startswith("-")]

    if sub in ALWAYS_DENY_SUB and (sub != "symbolic-ref" or len(positionals) >= 2):
        raise Decision(DENY, f"git {sub} : réécriture directe de références")
    if sub == "update-index":
        if args and all(a.startswith("--chmod=") or not a.startswith("-") for a in args) \
                and any(a.startswith("--chmod=") for a in args):
            return
        raise Decision(DENY, "git update-index : seule la forme --chmod=+x <chemin> est admise")
    if "--no-verify" in args:
        raise Decision(DENY, "--no-verify : les hooks git ne se contournent pas")
    if sub in ("commit", "push", "merge") and any(re.match(r"^-[a-zA-Z]*n", a) for a in args):
        raise Decision(DENY, f"-n sur git {sub} : les hooks git ne se contournent pas")

    if sub == "config":
        if any(a in args for a in ("--get", "--list", "-l", "--get-all", "--get-regexp",
                                   "--show-origin", "--get-urlmatch")):
            return
        if positionals and CONFIG_KEY_DENY.match(positionals[0]):
            raise Decision(DENY, f"git config {positionals[0]} : clé sensible")
        raise Decision(ASK, "git config en écriture")
    if sub == "branch":
        if "main" in args and any(a.startswith("-") and a not in BRANCH_LISTING for a in args):
            raise Decision(DENY, "git branch avec une option agissant sur main")
        return
    if sub in ("checkout", "switch", "worktree") and "main" in args \
            and any(a in ("-B", "-C", "--force-create", "--orphan") for a in args):
        raise Decision(DENY, f"git {sub} : recréation forcée de main")
    if sub == "tag" and any(a in ("-d", "-D", "--delete", "-f", "--force") for a in args):
        raise Decision(DENY, "git tag -d/-f : suppression ou écrasement d'une étiquette")
    if sub == "clean" and any(a == "--force" or (a.startswith("-") and not a.startswith("--") and "f" in a)
                              for a in args):
        raise Decision(DENY, "git clean -f : suppression de fichiers non suivis (doute)")
    if sub == "remote" and any(a in ("add", "set-url", "remove", "rename", "rm") for a in args):
        raise Decision(ASK, "git remote modifié")
    if sub == "fetch":
        if any(a.startswith("+") or a == "--update-head-ok" for a in args):
            raise Decision(DENY, "git fetch forcé")
        for a in args:
            src, sep, dst = a.partition(":")
            if sep and dst in MAIN_REFS and src not in MAIN_REFS:
                raise Decision(DENY, f"git fetch {a} : écriture de main")
        return
    if sub in TREE_WRITERS:
        for a in positionals:
            if is_protected(a, ctx.cwd, ctx.roots) or (sub in ("checkout", "restore") and a in (".", "./", ":/", "*")):
                raise Decision(DENY, f"git {sub} toucherait {a} (dossiers protégés : .claude/, .githooks/, tools/dev/)")
        return
    if sub == "push":
        pos, j = [], 0
        while j < len(args):
            a = args[j]
            if a in ("-o", "--push-option", "--repo", "--receive-pack", "--exec") \
                    or a.startswith(("--repo=", "--receive-pack=", "--exec=")):
                raise Decision(DENY, f"git push {a} (doute)")
            if a in ("--force", "--force-with-lease", "--force-if-includes", "--mirror", "--all",
                     "--prune", "--delete", "-d") or a.startswith("--force-with-lease="):
                raise Decision(DENY, f"git push {a} : push forcé, miroir ou suppression")
            if re.match(r"^-[a-zA-Z]*[fdn]", a):
                raise Decision(DENY, f"git push {a} : -f, -d ou -n")
            if a == "--":
                pos.extend(args[j + 1:])
                break
            if not a.startswith("-"):
                pos.append(a)
            j += 1
        refspecs = pos[1:]
        for r in refspecs:
            if r.startswith("+"):
                raise Decision(DENY, f"refspec forcé {r}")
            src, _, dst = r.partition(":")
            if dst in MAIN_REFS or src in MAIN_REFS:
                raise Decision(DENY, f"push vers ou depuis main ({r}) : passer par une pull request")
        if not refspecs or any(r.partition(":")[0] in ("HEAD", "@", "") for r in refspecs):
            if ctx.branch(repo) == "main":
                raise Decision(DENY, "push de la branche courante alors qu'on est sur main")
            if not refspecs and ctx.upstream_is_main(repo):
                raise Decision(DENY, "git push sans refspec : la branche suit origin/main ou push.default=matching")
        return
    if sub in MAIN_SENSITIVE:
        if sub == "pull" and any(a in ("--force", "-f") or a.startswith("+") for a in args):
            raise Decision(DENY, "git pull forcé")
        if ctx.branch(repo) == "main":
            if sub == "pull" and all(a in ("--ff-only", "--prune", "-p", "-q", "--quiet", "origin", "main") for a in args):
                return
            if sub == "reset":
                raise Decision(DENY, "git reset sur main : utiliser git restore --staged <chemin>")
            raise Decision(DENY, f"git {sub} alors qu'on est sur main : créer d'abord une branche (voir docs/CONVENTIONS.md)")
        return
    if sub in READ_ONLY_SUB:
        return
    raise Decision(DENY, f"sous-commande git non reconnue : {sub} (doute)")


# ---------------------------------------------------------------------------
# Règles gh.
# ---------------------------------------------------------------------------
GH_API_DENY = re.compile(r"/contents/|/git/refs|/merges(\b|$)|/pulls/\d+/merge(\b|$)")


def analyse_gh(words):
    args = words[1:]
    if not args:
        return
    if args[0] == "api":
        rest, method, body, endpoint, j = args[1:], "GET", False, "", 0
        while j < len(rest):
            a = rest[j]
            if a in ("-X", "--method"):
                method = rest[j + 1].upper() if j + 1 < len(rest) else ""
                j += 2
                continue
            if a.startswith("-X") and len(a) > 2:
                method = a[2:].upper()
            elif a.startswith("--method="):
                method = a.split("=", 1)[1].upper()
            elif a in ("-f", "-F", "--field", "--raw-field", "--input") \
                    or a.startswith(("--field=", "--raw-field=", "--input=")):
                body = True
            elif not a.startswith("-") and not endpoint:
                endpoint = a
            j += 1
        if endpoint == "graphql" and any("mutation" in a for a in rest):
            raise Decision(ASK, "gh api graphql avec une mutation")
        if method in ("PUT", "POST", "PATCH", "DELETE") or body:
            if GH_API_DENY.search(endpoint):
                raise Decision(DENY, f"gh api en écriture sur {endpoint} : modification directe du dépôt")
            raise Decision(ASK, f"gh api en écriture ({method}) sur {endpoint}")
        return
    if args[:2] == ["pr", "merge"]:
        if any(a in ("--admin", "--squash", "--rebase", "-s", "-r") for a in args):
            raise Decision(DENY, "gh pr merge --admin/--squash/--rebase : fusion par merge seulement, sans contournement")
        raise Decision(ASK, "gh pr merge : porte Intégrer, validation de l'utilisateur")
    if args[:2] == ["repo", "delete"]:
        raise Decision(DENY, "gh repo delete")
    if args[0] in ("alias", "extension", "auth") \
            or args[:2] in (["repo", "edit"], ["secret", "set"], ["release", "delete"]):
        raise Decision(ASK, f"gh {' '.join(args[:2])} : réglage du dépôt ou de l'outil")


# ---------------------------------------------------------------------------
# Règles shell.
# ---------------------------------------------------------------------------
GIT_WORD_RE = re.compile(r"\b(git|gh)\b")
PURE_READ = {
    "cat", "less", "more", "head", "tail", "wc", "grep", "rg", "egrep", "fgrep", "ls", "stat",
    "file", "diff", "cmp", "md5sum", "sha256sum", "echo", "printf", "test", "[", "[[", "tree",
    "du", "realpath", "readlink", "dirname", "basename", "shellcheck", "bat", "sort", "uniq",
    "cut", "tr", "awk", "jq", "xxd", "hexdump", "od", "strings", "true", "false", ":", "type",
    "which", "hash", "pwd", "date", "sleep", "env", "printenv", "uname", "id", "whoami",
    "python3", "python", "node", "bash", "sh",
}
SCRIPT_RUNNERS = {"bash", "sh", "python3", "python", "node"}
EXECUTORS = {
    "bash", "sh", "zsh", "dash", "ksh", "eval", "source", ".", "exec", "xargs", "parallel", "sudo",
    "doas", "su", "watch", "script", "chroot", "flock", "python", "python3", "node", "perl",
    "ruby", "php", "ssh", "make",
}
FIND_DANGEROUS = {"-exec", "-execdir", "-ok", "-okdir", "-delete"}
CHMOD_OK = re.compile(r"^([ugoa]*\+x|0?7[0-7]5|0?755)$")


def is_pure_read(base, words):
    if base == "find":
        return not any(a in FIND_DANGEROUS for a in words)
    if base == "sed":
        return not any(a.startswith("-i") or a.startswith("--in-place") for a in words[1:])
    if base == "chmod":
        return len(words) > 1 and bool(CHMOD_OK.match(words[1]))
    if base in SCRIPT_RUNNERS:
        # Exécuter un script du projet est permis ; les options -c/-e/-s/- sont
        # traitées comme commandes indirectes plus bas.
        return not any(a in ("-c", "-e", "-s", "-") for a in words[1:])
    return base in PURE_READ


def analyse_segment(segment, ctx, mentions, subshell):
    words, writes = extract_redirs(segment)
    for target in writes:
        if is_protected(target, ctx.cwd, ctx.roots):
            raise Decision(DENY, f"redirection vers {target} : les garde-fous ne se modifient que par Edit ou Write")
    while words and words[0] in KEYWORDS:
        words = words[1:]
    if not words:
        return
    words, envs = strip_prefixes(words)
    if not words:
        return
    head = words[0]
    base = os.path.basename(head)
    if "$" in head or "`" in head:
        raise Decision(DENY, f"commande dont le nom est une variable ({head}) : doute")

    if base in ("git", "gh"):
        bad = [e for e in envs if e not in ENV_OK]
        if bad:
            raise Decision(DENY, f"variable d'environnement {bad[0]} devant {base} (doute)")
        if base == "git":
            analyse_git(words, ctx)
        else:
            analyse_gh(words)
        return

    if base in ("cd", "pushd", "popd"):
        if not mentions:
            return
        if subshell:
            raise Decision(DENY, "cd dans une commande avec sous-shell et git : la branche ne peut plus être vérifiée")
        if base == "popd" or len(words) < 2 or words[1] == "-" or "$" in words[1] or "`" in words[1]:
            raise Decision(DENY, "cd combiné à git ou gh sans cible vérifiable : la branche ne peut plus être vérifiée")
        ctx.change_dir(words[1])
        return

    if base in ("sudo", "doas", "su"):
        raise Decision(DENY, f"{base} : aucune élévation de privilèges n'est nécessaire pour ce projet")

    if base in EXECUTORS or (base == "find" and any(a in FIND_DANGEROUS for a in words)):
        indirect = any(a in ("-c", "-e", "-s", "-") for a in words[1:]) or base not in SCRIPT_RUNNERS
        if indirect and (GIT_WORD_RE.search(" ".join(words)) or (base in ("eval", "source", ".") and mentions)):
            raise Decision(ASK, f"{base} avec git ou gh : commande indirecte, à confirmer")

    pure = is_pure_read(base, words)
    for w in words[1:]:
        if os.path.basename(w) in ("git", "gh") and not pure:
            raise Decision(DENY, f"git ou gh en position inattendue après {base} (doute)")
    if not pure:
        for w in words[1:]:
            if is_protected(w, ctx.cwd, ctx.roots):
                raise Decision(DENY, f"{base} toucherait {w} : les garde-fous ne se modifient que par Edit ou Write")


# ---------------------------------------------------------------------------
# Orchestration.
# ---------------------------------------------------------------------------
def analyse(cmd, cwd, roots):
    if len(cmd) > 20000 or re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", cmd):
        raise Decision(DENY, "commande trop longue ou contenant des caractères de contrôle")
    text, bodies = strip_heredocs(cmd)
    effective = text + "\n" + "\n".join(body for quoted, body in bodies if not quoted)
    mentions = bool(GIT_WORD_RE.search(effective))
    if mentions and re.search(r"\$\(|`|[<>]\(|\$\{[^}]*[#%/^,]", effective):
        raise Decision(ASK, "substitution de commande ($(…), `…`, <(…)) combinée à git ou gh : à confirmer")
    segments, subshell = split_segments(tokenize(text))
    ctx, decisions = Ctx(cwd, roots), []
    for segment in segments:
        try:
            analyse_segment(segment, ctx, mentions, subshell)
        except Decision as d:
            decisions.append(d)
    for kind in (DENY, ASK):
        for d in decisions:
            if d.kind == kind:
                raise d


def decide(cmd, cwd, roots):
    try:
        analyse(cmd, cwd, roots)
        return ALLOW, ""
    except Decision as d:
        return d.kind, d.msg


def main():
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("pas un objet")
        if data.get("tool_name") != "Bash":
            return 0
        cmd = data.get("tool_input", {}).get("command")
        if not isinstance(cmd, str) or not cmd.strip():
            raise ValueError("champ command absent")
        cwd = data.get("cwd")
        if not isinstance(cwd, str) or not cwd:
            cwd = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
        roots = {r for r in (os.environ.get("CLAUDE_PROJECT_DIR"),
                             git_run(cwd, "rev-parse", "--show-toplevel") if os.path.isdir(cwd) else None,
                             cwd) if r}
        kind, msg = decide(cmd, cwd, roots)
    except Exception as exc:  # toute panne = bloqué
        kind, msg = DENY, f"entrée illisible ou erreur interne ({type(exc).__name__} : {exc})"
    if kind == DENY:
        sys.stderr.write(f"Bloqué par le garde-fou Flâne : {msg}.\n")
        return 2
    if kind == ASK:
        sys.stdout.write(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": f"Garde-fou Flâne : {msg}.",
        }}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
