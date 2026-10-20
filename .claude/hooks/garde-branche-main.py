#!/usr/bin/env python3
"""Garde-fou Flâne : analyse l'appel Bash de Claude Code (JSON sur l'entrée standard).

Sortie 2 avec un message sur stderr : appel bloqué.
Sortie 0 sans sortie : appel autorisé.
Sortie 0 avec un JSON sur stdout : demande de confirmation à l'utilisateur.

Règle absolue : en cas de doute, on bloque ou on demande. Un faux positif se
corrige en reformulant la commande ; un faux négatif laisserait passer une
modification de main ou un contournement des hooks. Le script est appelé par
garde-branche-main.sh, qui convertit toute panne en blocage.

Limites connues (docs/SECURITE.md) : un script exécuté depuis un fichier hors
des dossiers protégés est seulement demandé ; la garantie forte reste côté
serveur (règle GitHub sur main, vérifications automatiques).

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
# Heredocs : retirés avant la tokenisation et remplacés par __HEREDOC_n__.
# Un corps à délimiteur cité est une donnée (sauf s'il nourrit un interpréteur,
# voir check_runner) ; un corps non cité subit l'expansion bash, il est donc
# réinjecté pour la détection de substitution.
# ---------------------------------------------------------------------------
HEREDOC_RE = re.compile(r"<<-?\s*(?P<q>['\"]?)\\?(?P<d>[A-Za-z_][A-Za-z0-9_]*)(?P=q)")
HEREDOC_TOKEN_RE = re.compile(r"^__HEREDOC_(\d+)__$")


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
            out.append(line[:m.start()] + f" __HEREDOC_{len(bodies)}__ " + line[m.end():])
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
    """Découpe sur && || ; | |& & saut de ligne ( ). Signale aussi un sous-shell."""
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
    """Sépare les mots des redirections. Renvoie (mots, cibles écrites, lectures)."""
    words, writes, reads, i = [], [], [], 0
    while i < len(segment):
        tok = segment[i]
        if REDIR_RE.fullmatch(tok):
            if words and words[-1].isdigit():
                words.pop()
            target = segment[i + 1] if i + 1 < len(segment) else ""
            if target and not target.isdigit() and target != "-":
                if tok in ("<", "<<<"):
                    reads.append((tok, target))
                elif tok == "<>" or (">" in tok and not tok.startswith("<&")):
                    writes.append(target)
            i += 2
            continue
        words.append(tok)
        i += 1
    return words, writes, reads


# ---------------------------------------------------------------------------
# Chemins protégés : les garde-fous (et .git, .github) ne se modifient que par
# les outils Edit et Write de Claude Code, soumis à une demande (settings.json).
# ---------------------------------------------------------------------------
PROTECTED = ((".claude",), (".githooks",), (".github",), (".git",), ("tools", "dev"))
ANY_COMPONENT = {".claude", ".githooks", ".github", ".git"}
PROTECTED_SUBSTR_RE = re.compile(
    r"(?:^|[^A-Za-z0-9_.\-])(?:\.claude|\.githooks|\.github|\.git|tools/dev)(?:[/\s'\"`)]|$)")
DYNAMIC_RE = re.compile(r"[$`]|\{[^{}]*,[^{}]*\}")
PROTECTED_LABEL = "les garde-fous (.claude/, .githooks/, .github/, .git/, tools/dev/) ne se modifient que par Edit ou Write"


def is_protected(tok, cwd, roots):
    # Un argument --option=chemin est coupé sur « = » pour examiner le chemin.
    for part in tok.split("="):
        if not part:
            continue
        path = os.path.expanduser(part.replace("\\", "/"))
        absolute = posixpath.normpath(path if posixpath.isabs(path) else posixpath.join(cwd, path))
        comps = [c for c in absolute.split("/") if c]
        if ANY_COMPONENT.intersection(comps):
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


def is_dynamic(tok):
    return bool(DYNAMIC_RE.search(tok))


# ---------------------------------------------------------------------------
# Préfixes : affectations, env, command, nohup, nice, timeout.
# ---------------------------------------------------------------------------
ASSIGN_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
DURATION_RE = re.compile(r"^\d+(\.\d+)?[smhd]?$")
ENV_SENSITIVE_RE = re.compile(r"^(GIT_|GH_|GITLEAKS_)")
ENV_OK = {
    "GIT_PAGER", "PAGER", "GIT_TERMINAL_PROMPT", "GIT_EDITOR", "EDITOR", "LANG", "LC_ALL",
    "LC_MESSAGES", "TZ", "NO_COLOR", "CLICOLOR", "GH_PAGER", "GH_NO_UPDATE_NOTIFIER",
    "GH_PROMPT_DISABLED", "GIT_OPTIONAL_LOCKS", "GIT_TRACE", "FORCE_COLOR",
}
SHELL_SETTERS = {"export", "declare", "typeset", "readonly", "local"}


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


def check_env_names(names, context):
    for name in names:
        if ENV_SENSITIVE_RE.match(name) and name not in ENV_OK:
            raise Decision(DENY, f"variable d'environnement {name} {context} (doute)")


# ---------------------------------------------------------------------------
# Lecture de la branche : seul effet de bord, borné dans le temps. Les
# changements de branche faits dans la même commande (checkout, switch, cd)
# sont suivis segment par segment.
# ---------------------------------------------------------------------------
def git_exec(repo, *args):
    try:
        return subprocess.run(
            ["git", "-C", repo, *args], capture_output=True, text=True, timeout=5,
            env={**os.environ, "GIT_OPTIONAL_LOCKS": "0", "LC_ALL": "C"},
        )
    except (OSError, subprocess.TimeoutExpired):
        return None


def git_run(repo, *args):
    result = git_exec(repo, *args)
    if result is None or result.returncode != 0:
        return None
    return result.stdout.strip()


def resolve_path(tok, cwd):
    path = os.path.expanduser(tok.replace("\\", "/"))
    return posixpath.normpath(path if posixpath.isabs(path) else posixpath.join(cwd, path))


SCRATCH_PREFIX = "/tmp/claude-"


def is_inside_roots(absolute, roots):
    for root in roots:
        root = posixpath.normpath(root)
        if absolute == root or absolute.startswith(root + "/"):
            return True
    return False


UNKNOWN_BRANCH = "__unknown__"


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
                inside = git_run(repo, "rev-parse", "--is-inside-work-tree")
                head = git_run(repo, "rev-parse", "--verify", "--quiet", "HEAD")
                if inside == "true" and head is None:
                    branch = "__unborn__"  # dépôt sans aucun commit : rien à protéger encore
                else:
                    raise Decision(DENY, "pas un dépôt git, ou git indisponible (doute)")
            if branch == "HEAD":
                raise Decision(DENY, "HEAD détaché : la branche est inconnue (doute)")
            self.cache[repo] = branch
        branch = self.cache[repo]
        if branch == UNKNOWN_BRANCH:
            raise Decision(DENY, "la branche a été changée plus tôt dans la commande vers une cible inconnue (doute)")
        return branch

    def set_branch(self, repo, name):
        self.cache[posixpath.normpath(repo)] = name

    def upstream_is_main(self, repo):
        upstream = git_run(repo, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}") or ""
        push_default = git_run(repo, "config", "--get", "push.default") or ""
        return upstream.endswith("/main") or push_default == "matching"

    def change_dir(self, target):
        expanded = os.path.expanduser(target)
        new = posixpath.normpath(expanded if posixpath.isabs(expanded) else posixpath.join(self.cwd, expanded))
        if not os.path.isdir(new):
            raise Decision(DENY, f"cd vers un dossier introuvable ({target}) : le dossier courant ne peut plus être suivi")
        self.cwd = new
        top = git_run(new, "rev-parse", "--show-toplevel")
        if top:
            self.roots.add(top)


# ---------------------------------------------------------------------------
# Règles git.
# ---------------------------------------------------------------------------
def opt_matches(arg, *names):
    """Vrai si arg est une option longue égale à, ou préfixe non trivial de, l'un des names.
    git accepte tout préfixe non ambigu : --no-veri vaut --no-verify."""
    name = arg.split("=", 1)[0]
    if not name.startswith("--") or len(name) < 3:
        return False
    return any(n == name or n.startswith(name) for n in names)


CONFIG_KEY_OK = re.compile(
    r"^(color\..*|core\.pager|core\.editor|core\.quotepath|commit\.gpgsign|gpg\..*|"
    r"user\.(name|email)|advice\..*|pager\..*|safe\.directory)$", re.I)
CONFIG_KEY_DENY = re.compile(
    r"^(core\.hookspath|alias\.|include|url\.|credential|core\.sshcommand|core\.gitproxy|"
    r"core\.fsmonitor|core\.editor|core\.pager|diff\..*\.command|diff\.external|"
    r"merge\..*\.driver|filter\.|remote\.|push\.|receive\.|safe\.|init\.templatedir)", re.I)
GLOBAL_OK = {
    "--no-pager", "-p", "--paginate", "--no-optional-locks", "--literal-pathspecs",
    "--glob-pathspecs", "--noglob-pathspecs", "--icase-pathspecs", "--no-replace-objects",
    "--no-advice", "--no-lazy-fetch",
}
READ_ONLY_SUB = {
    "status", "log", "diff", "show", "blame", "rev-parse", "ls-files", "ls-tree", "cat-file",
    "describe", "shortlog", "grep", "for-each-ref", "name-rev", "count-objects", "fsck", "help",
    "version", "check-ignore", "ls-remote", "merge-base", "rev-list", "diff-tree", "whatchanged",
    "add", "bisect", "show-ref", "var", "check-attr", "bundle", "range-diff", "cherry",
    "format-patch", "tag", "notes", "remote",
}
MAIN_SENSITIVE = {"commit", "merge", "rebase", "cherry-pick", "am", "revert", "reset", "pull"}
ALWAYS_DENY_SUB = {"update-ref", "filter-branch", "filter-repo", "replace", "symbolic-ref"}
TREE_WRITERS = {"restore", "clean", "rm", "mv", "apply", "clone", "init", "worktree", "submodule", "archive"}
BRANCH_LISTING = {
    "-a", "-r", "-v", "-vv", "--list", "--contains", "--merged", "--no-merged", "--show-current",
    "--format", "--sort", "--points-at", "--column", "--color", "--no-color", "--all", "--remotes",
}
MAIN_REFS = ("main", "refs/heads/main")


def parse_global_options(words, ctx):
    """Options globales de git. Renvoie (dépôt visé, index de la sous-commande), ou (repo, None) si --help."""
    repo, i = ctx.cwd, 1
    while i < len(words) and words[i].startswith("-"):
        w = words[i]
        if w == "-C":
            i += 1
            path = words[i] if i < len(words) else ""
            if is_dynamic(path):
                raise Decision(DENY, "git -C avec un chemin dynamique (doute)")
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
            return repo, None
        else:
            raise Decision(DENY, f"option globale de git non reconnue : {w} (doute)")
        i += 1
    return repo, i


def check_push(args, ctx, repo):
    # Le push forcé est une exception explicite : demandé à l'utilisateur,
    # jamais silencieux, consigné dans le journal. Côté serveur, la règle
    # GitHub sur main l'interdit de toute façon.
    pos, forced, j = [], False, 0
    while j < len(args):
        a = args[j]
        if opt_matches(a, "--push-option", "--repo", "--receive-pack", "--exec") or a == "-o":
            raise Decision(DENY, f"git push {a} (doute)")
        if opt_matches(a, "--mirror", "--all", "--prune", "--delete") or a == "-d":
            raise Decision(DENY, f"git push {a} : miroir, suppression ou envoi global")
        if opt_matches(a, "--force", "--force-with-lease", "--force-if-includes"):
            forced = True
        elif re.match(r"^-[a-zA-Z]*d", a):
            raise Decision(DENY, f"git push {a} : -d supprime une branche distante")
        elif re.match(r"^-[a-zA-Z]*f", a):
            forced = True
        if a == "--":
            pos.extend(args[j + 1:])
            break
        if not a.startswith("-"):
            pos.append(a)
        j += 1
    refspecs = pos[1:]
    if any(r.startswith("+") for r in refspecs):
        forced = True
    if forced:
        raise Decision(ASK, "push forcé : exception à confirmer par l'utilisateur, puis à consigner dans le journal")
    if pos and pos[0] != "origin":
        raise Decision(ASK, f"push vers un dépôt distant autre que origin ({pos[0]}) : à confirmer")
    for r in refspecs:
        src, _, dst = r.partition(":")
        if dst in MAIN_REFS or src in MAIN_REFS:
            raise Decision(DENY, f"push vers ou depuis main ({r}) : passer par une pull request")
    if not refspecs or any(r.partition(":")[0] in ("HEAD", "@", "") for r in refspecs):
        if ctx.branch(repo) == "main":
            raise Decision(DENY, "push de la branche courante alors qu'on est sur main")
        if not refspecs and ctx.upstream_is_main(repo):
            raise Decision(DENY, "git push sans refspec : la branche suit origin/main ou push.default=matching")


def check_config(args, ctx):
    if any(a in args for a in ("--get", "--list", "-l", "--get-all", "--get-regexp",
                               "--show-origin", "--get-urlmatch")) or "get" in args or "list" in args:
        return
    for a in args:
        if CONFIG_KEY_DENY.match(a):
            raise Decision(DENY, f"git config {a} : clé sensible")
        if not a.startswith("-") and is_protected(a, ctx.cwd, ctx.roots):
            raise Decision(DENY, f"git config sur {a} : {PROTECTED_LABEL}")
    raise Decision(ASK, "git config en écriture")


def check_checkout(sub, args, ctx, repo):
    """checkout et switch : chemins protégés interdits ; la branche visée est mémorisée."""
    if "--" in args:
        idx = args.index("--")
        flags, paths = args[:idx], args[idx + 1:]
    else:
        flags, paths = args, []
    if "main" in flags and any(a in ("-B", "-C", "--force-create", "--orphan") for a in flags):
        raise Decision(DENY, f"git {sub} : recréation forcée de main")
    for a in paths + [a for a in flags if not a.startswith("-")]:
        if is_protected(a, ctx.cwd, ctx.roots) or a in (".", "./", ":/", "*"):
            raise Decision(DENY, f"git {sub} toucherait {a} : {PROTECTED_LABEL}")
    if any(a in ("-f", "-m") or opt_matches(a, "--force", "--discard-changes", "--merge") for a in flags):
        raise Decision(ASK, f"git {sub} forcé : écraserait des modifications locales, à confirmer")
    if paths:
        raise Decision(ASK, f"git {sub} -- <chemins> : restaure des fichiers et écrase le travail en cours, à confirmer")
    target = None
    creation = [k for k, a in enumerate(flags) if a in ("-b", "-B", "-c", "-C", "--orphan")]
    if creation:
        k = creation[0]
        target = flags[k + 1] if k + 1 < len(flags) else UNKNOWN_BRANCH
    else:
        positionals = [a for a in flags if not a.startswith("-")]
        if positionals:
            target = positionals[0]
            if os.path.exists(os.path.join(ctx.cwd, target)) and git_run(repo, "rev-parse", "--verify", "--quiet", target) is None:
                raise Decision(ASK, f"git {sub} {target} : restaure un fichier et écrase le travail en cours, à confirmer")
        elif "-" in flags or any(a in ("--detach",) for a in flags):
            target = UNKNOWN_BRANCH  # branche précédente ou HEAD détaché : inconnue
    if target is not None:
        if target == "-" or is_dynamic(target):
            target = UNKNOWN_BRANCH
        if target != UNKNOWN_BRANCH and not creation:
            # Changer de branche ou de commit ne doit pas ramener d'anciens garde-fous.
            result = git_exec(repo, "diff", "--quiet", target, "--", ".claude", ".githooks", "tools/dev", ".github")
            if result is None or result.returncode != 0:
                raise Decision(ASK, f"git {sub} {target} : les garde-fous diffèrent sur la cible (ou cible inconnue), à confirmer")
        ctx.set_branch(repo, target)


def analyse_git(words, ctx):
    repo, i = parse_global_options(words, ctx)
    if i is None or i >= len(words):
        return
    sub, args = words[i], words[i + 1:]
    positionals = [a for a in args if not a.startswith("-")]

    if sub in ALWAYS_DENY_SUB and (sub != "symbolic-ref" or len(positionals) >= 2):
        raise Decision(DENY, f"git {sub} : réécriture directe de références")
    if sub == "update-index":
        if args and any(a.startswith("--chmod=") for a in args) \
                and all(a.startswith("--chmod=") or not a.startswith("-") for a in args):
            return
        raise Decision(DENY, "git update-index : seule la forme --chmod=+x <chemin> est admise")
    if any(opt_matches(a, "--no-verify") for a in args):
        raise Decision(DENY, "--no-verify : les hooks git ne se contournent pas")
    if sub == "commit" and any(re.match(r"^-[a-zA-Z]*n", a) for a in args):
        raise Decision(DENY, "-n sur git commit : les hooks git ne se contournent pas")

    if sub in ("fetch", "pull", "clone", "ls-remote", "archive") \
            and any(opt_matches(a, "--upload-pack", "--exec", "--remote") or a == "-u" for a in args):
        raise Decision(DENY, f"git {sub} avec un programme distant personnalisé (doute)")
    if sub in ("gc", "prune", "maintenance"):
        raise Decision(ASK, f"git {sub} : entretien qui supprime des objets récupérables, à confirmer")
    if sub == "reflog":
        if positionals and positionals[0] in ("expire", "delete"):
            raise Decision(ASK, "git reflog expire/delete : supprime des points de récupération, à confirmer")
        return
    if sub == "stash":
        if positionals and positionals[0] in ("drop", "clear"):
            raise Decision(ASK, "git stash drop/clear : supprime du travail mis de côté, à confirmer")
        return
    if sub == "config":
        check_config(args, ctx)
        return
    if sub == "branch":
        if "main" in args and any(a.startswith("-") and a not in BRANCH_LISTING for a in args):
            raise Decision(DENY, "git branch avec une option agissant sur main")
        if any(a in ("-D", "-d", "-m", "-M", "-f") or opt_matches(a, "--delete", "--move", "--force") for a in args):
            raise Decision(ASK, "git branch qui supprime, renomme ou force une branche : à confirmer")
        return
    if sub in ("checkout", "switch"):
        check_checkout(sub, args, ctx, repo)
        return
    if sub == "tag" and any(a in ("-d", "-D", "-f") or opt_matches(a, "--delete", "--force") for a in args):
        raise Decision(DENY, "git tag -d/-f : suppression ou écrasement d'une étiquette")
    if sub == "clean" and any(opt_matches(a, "--force") or (a.startswith("-") and not a.startswith("--") and "f" in a)
                              for a in args):
        raise Decision(DENY, "git clean -f : suppression de fichiers non suivis (doute)")
    if sub == "remote" and any(a in ("add", "set-url", "remove", "rename", "rm") for a in args):
        raise Decision(ASK, "git remote modifié")
    if sub == "fetch":
        if any(a.startswith("+") or opt_matches(a, "--update-head-ok") for a in args):
            raise Decision(DENY, "git fetch forcé")
        for a in args:
            src, sep, dst = a.partition(":")
            if sep and dst in MAIN_REFS and src not in MAIN_REFS:
                raise Decision(DENY, f"git fetch {a} : écriture de main")
        return
    if sub in TREE_WRITERS:
        if sub == "worktree" and "main" in args and any(a in ("-B", "--orphan") for a in args):
            raise Decision(DENY, "git worktree : recréation forcée de main")
        for a in positionals:
            if is_protected(a, ctx.cwd, ctx.roots) or (sub == "restore" and a in (".", "./", ":/", "*")):
                raise Decision(DENY, f"git {sub} toucherait {a} : {PROTECTED_LABEL}")
        return
    if sub == "push":
        check_push(args, ctx, repo)
        return
    if sub in MAIN_SENSITIVE:
        if sub == "pull" and any(a in ("-f",) or opt_matches(a, "--force") or a.startswith("+") for a in args):
            raise Decision(DENY, "git pull forcé")
        if ctx.branch(repo) == "main":
            if sub == "pull" and all(a in ("--ff-only", "--prune", "-p", "-q", "--quiet", "origin", "main") for a in args):
                return
            if sub == "reset":
                raise Decision(DENY, "git reset sur main : utiliser git restore --staged <chemin>")
            raise Decision(DENY, f"git {sub} alors qu'on est sur main : créer d'abord une branche (voir docs/CONVENTIONS.md)")
        return
    if sub in READ_ONLY_SUB:
        if any(a == "-o" or opt_matches(a, "--output") for a in args):
            raise Decision(DENY, f"git {sub} --output : écrirait dans un fichier (doute)")
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
    if args[:2] in (["pr", "create"], ["issue", "create"], ["pr", "comment"], ["issue", "comment"],
                    ["pr", "edit"], ["issue", "edit"], ["release", "create"], ["pr", "review"]):
        # Un fichier de corps vient du brouillon de Claude, jamais d'ailleurs : un
        # fichier de configuration ou un secret finirait publié sur GitHub.
        for k, a in enumerate(args):
            if a in ("-F", "--body-file", "--template", "--notes-file") \
                    or a.startswith(("--body-file=", "--template=", "--notes-file=")):
                path = a.split("=", 1)[1] if "=" in a else (args[k + 1] if k + 1 < len(args) else "")
                if is_dynamic(path) or not resolve_path(path, os.getcwd()).startswith(SCRATCH_PREFIX):
                    raise Decision(ASK, f"gh {args[0]} {args[1]} avec un fichier de corps hors du brouillon ({path}) : à confirmer")
        return
    if args[:2] == ["pr", "merge"]:
        if any(a in ("-s", "-r") or opt_matches(a, "--admin", "--squash", "--rebase") for a in args):
            raise Decision(DENY, "gh pr merge --admin/--squash/--rebase : fusion par merge seulement, sans contournement")
        raise Decision(ASK, "gh pr merge : porte Intégrer, validation de l'utilisateur")
    if args[:2] == ["repo", "delete"]:
        raise Decision(DENY, "gh repo delete")
    if args[0] in ("alias", "extension", "auth") \
            or args[:2] in (["repo", "edit"], ["repo", "sync"], ["secret", "set"], ["release", "delete"]):
        raise Decision(ASK, f"gh {' '.join(args[:2])} : réglage du dépôt ou de l'outil")


# ---------------------------------------------------------------------------
# Règles shell.
# ---------------------------------------------------------------------------
GIT_WORD_RE = re.compile(r"\b(git|gh)\b")
PURE_READ = {
    "cat", "less", "more", "head", "tail", "wc", "grep", "rg", "egrep", "fgrep", "ls", "stat",
    "file", "diff", "cmp", "md5sum", "sha256sum", "echo", "printf", "test", "[", "[[", "tree",
    "du", "realpath", "readlink", "dirname", "basename", "shellcheck", "bat", "uniq", "cut",
    "tr", "jq", "xxd", "hexdump", "od", "strings", "true", "false", ":", "type", "which", "hash",
    "pwd", "date", "sleep", "env", "printenv", "uname", "id", "whoami", "gitleaks", "column",
    "nl", "tac", "rev", "fold", "paste", "comm", "join", "expand", "unexpand",
}
SCRIPT_RUNNERS = {"bash", "sh", "python3", "python", "node"}
INLINE_FLAGS = {"-c", "-e", "-s", "-m"}
EXECUTORS = {
    "bash", "sh", "zsh", "dash", "ksh", "eval", "source", ".", "exec", "xargs", "parallel",
    "watch", "script", "chroot", "flock", "python", "python3", "node", "perl", "ruby", "php",
    "ssh", "make",
}
# Commandes qui écrivent dans le fichier qu'on leur désigne : chemins dynamiques interdits.
WRITERS = {
    "tee", "cp", "mv", "rm", "install", "ln", "dd", "rsync", "truncate", "chmod", "chown",
    "chgrp", "patch", "tar", "unzip", "curl", "wget", "sort", "sed", "awk", "perl", "tree",
}
# Programmes en ligne (awk, sed, perl) : leur texte est examiné, pas leurs variables.
SCRIPT_LANGS = {"awk", "sed", "perl"}
FIND_DANGEROUS_RE = re.compile(r"^-(exec|execdir|ok|okdir|delete|fprint0?|fprintf|fls)$")
CHMOD_OK = re.compile(r"^([ugoa]*\+x|0?7[0-7]5|0?755)$")
SED_WRITE_RE = re.compile(r"(^|[;{\n])\s*[wWe](\s|$)|/[a-zA-Z]*[we](\s|;|$)")
AWK_WRITE_RE = re.compile(r">|\bsystem\s*\(|\|")


def is_pure_read(base, words):
    if base == "find":
        return not any(FIND_DANGEROUS_RE.match(a) for a in words)
    if base == "sed":
        return not any(a.startswith("-i") or a.startswith("--in-place") or SED_WRITE_RE.search(a) for a in words[1:])
    if base == "awk":
        return not any(AWK_WRITE_RE.search(a) for a in words[1:])
    if base == "sort":
        return not any(a == "-o" or a.startswith("--output") or re.match(r"^-[a-zA-Z]*o", a) for a in words[1:])
    if base == "tree":
        return not any(a == "-o" for a in words[1:])
    if base == "rg":
        return not any(a.startswith("--pre") for a in words[1:])
    if base == "chmod":
        return len(words) > 1 and bool(CHMOD_OK.match(words[1]))
    return base in PURE_READ


def check_code(code, what):
    """Code destiné à un interpréteur : chemins protégés et git demandent confirmation."""
    if PROTECTED_SUBSTR_RE.search(code):
        raise Decision(ASK, f"{what} mentionne un dossier protégé : à confirmer")
    if GIT_WORD_RE.search(code):
        raise Decision(ASK, f"{what} contient git ou gh : commande indirecte, à confirmer")


def find_script(rest):
    """Premier argument qui n'est ni une option, ni un heredoc : le fichier de script."""
    skip = False
    for a in rest:
        if skip:
            skip = False
            continue
        if a in ("-X", "-W", "-Q", "--check-hash-based-pycs"):
            skip = True
            continue
        if a.startswith("-") or HEREDOC_TOKEN_RE.match(a):
            continue
        return a
    return None


def check_runner(base, words, reads, ctx, bodies):
    """bash, sh, python3, node : d'où vient le programme exécuté ?"""
    rest = words[1:]
    if any(a in INLINE_FLAGS for a in rest):
        check_code(" ".join(rest), f"{base} avec un programme en ligne")
        return
    script = find_script(rest)
    if script is not None:
        if is_dynamic(script):
            raise Decision(DENY, f"{base} avec un chemin de script dynamique (doute)")
        if is_protected(script, ctx.cwd, ctx.roots):
            return  # script du projet, protégé en écriture : exécution permise
        raise Decision(ASK, f"{base} exécute un script hors des dossiers protégés ({script}) : à confirmer")
    # Pas de fichier : le programme arrive par l'entrée standard.
    heredocs = [int(m.group(1)) for m in (HEREDOC_TOKEN_RE.match(a) for a in rest) if m]
    if heredocs:
        for n in heredocs:
            body = bodies[n][1]
            if base in ("bash", "sh"):
                analyse_text(body, ctx)
            else:
                check_code(body, f"{base} avec un script sur l'entrée standard")
        return
    for op, target in reads:
        if op == "<<<":
            check_code(target, f"{base} avec une chaîne sur l'entrée standard")
            return
        raise Decision(ASK, f"{base} lit un script depuis {target} : à confirmer")
    raise Decision(ASK, f"{base} sans programme identifiable : à confirmer")


def analyse_segment(segment, ctx, mentions, subshell, bodies):
    words, writes, reads = extract_redirs(segment)
    for target in writes:
        if is_dynamic(target):
            raise Decision(DENY, f"redirection vers un chemin dynamique ({target}) : doute")
        if is_protected(target, ctx.cwd, ctx.roots):
            raise Decision(DENY, f"redirection vers {target} : {PROTECTED_LABEL}")
        absolute = resolve_path(target, ctx.cwd)
        if not (is_inside_roots(absolute, ctx.roots) or absolute.startswith(SCRATCH_PREFIX) or absolute.startswith("/dev/")):
            raise Decision(ASK, f"redirection vers {target}, hors du projet et du brouillon : à confirmer")
    while words and words[0] in KEYWORDS:
        words = words[1:]
    if not words:
        return
    words, envs = strip_prefixes(words)
    if not words:
        check_env_names(envs, "définie pour la suite de la commande")
        return
    head = words[0]
    base = os.path.basename(head)
    if "$" in head or "`" in head:
        raise Decision(DENY, f"commande dont le nom est une variable ({head}) : doute")

    if base in ("git", "gh"):
        check_env_names(envs, f"devant {base}")
        bad = [e for e in envs if e not in ENV_OK and not ENV_SENSITIVE_RE.match(e)]
        if bad and base == "git":
            raise Decision(DENY, f"variable d'environnement {bad[0]} devant git (doute)")
        if base == "git":
            analyse_git(words, ctx)
        else:
            analyse_gh(words)
        return

    if base in SHELL_SETTERS:
        check_env_names([a.split("=", 1)[0] for a in words[1:] if not a.startswith("-")], f"par {base}")
        return

    if base in ("cd", "pushd", "popd"):
        if subshell and (mentions or writes):
            raise Decision(DENY, "cd dans une commande avec sous-shell : le dossier courant ne peut plus être suivi")
        if base == "popd" or len(words) < 2 or words[1] == "-" or is_dynamic(words[1]):
            raise Decision(DENY, "cd sans cible vérifiable : le dossier courant ne peut plus être suivi")
        ctx.change_dir(words[1])
        return

    if base in ("sudo", "doas", "su"):
        raise Decision(DENY, f"{base} : aucune élévation de privilèges n'est nécessaire pour ce projet")

    if base in SCRIPT_RUNNERS:
        check_runner(base, words, reads, ctx, bodies)
        return

    if base in EXECUTORS or (base == "find" and any(FIND_DANGEROUS_RE.match(a) for a in words)):
        if GIT_WORD_RE.search(" ".join(words)) or (base in ("eval", "source", ".") and mentions):
            raise Decision(ASK, f"{base} avec git ou gh : commande indirecte, à confirmer")

    pure = is_pure_read(base, words)
    if pure:
        return
    for w in words[1:]:
        if os.path.basename(w) in ("git", "gh"):
            raise Decision(DENY, f"git ou gh en position inattendue après {base} (doute)")
    if base in SCRIPT_LANGS:
        for w in words[1:]:
            if PROTECTED_SUBSTR_RE.search(w):
                raise Decision(DENY, f"{base} mentionne un dossier protégé : {PROTECTED_LABEL}")
            if GIT_WORD_RE.search(w):
                raise Decision(ASK, f"{base} avec git ou gh : commande indirecte, à confirmer")
        return
    for w in words[1:]:
        if is_protected(w, ctx.cwd, ctx.roots):
            raise Decision(DENY, f"{base} toucherait {w} : {PROTECTED_LABEL}")
        if base in WRITERS and is_dynamic(w):
            raise Decision(DENY, f"{base} avec un chemin dynamique ({w}) : doute")
    if base == "find":
        raise Decision(ASK, "find qui exécute ou supprime : à confirmer")
    if base == "rg":
        raise Decision(ASK, "rg --pre exécute un programme : à confirmer")


# ---------------------------------------------------------------------------
# Orchestration.
# ---------------------------------------------------------------------------
def analyse_text(cmd, ctx):
    """Analyse un texte bash (la commande, ou un script bash passé en heredoc)."""
    text, bodies = strip_heredocs(cmd)
    effective = text + "\n" + "\n".join(body for quoted, body in bodies if not quoted)
    mentions = bool(GIT_WORD_RE.search(effective))
    if mentions and re.search(r"\$\(|`|[<>]\(|\$\{[^}]*[#%/^,]", effective):
        raise Decision(ASK, "substitution de commande ($(…), `…`, <(…)) combinée à git ou gh : à confirmer")
    segments, subshell = split_segments(tokenize(text))
    decisions = []
    for segment in segments:
        try:
            analyse_segment(segment, ctx, mentions, subshell, bodies)
        except Decision as d:
            decisions.append(d)
    for kind in (DENY, ASK):
        for d in decisions:
            if d.kind == kind:
                raise d


def analyse(cmd, cwd, roots):
    if len(cmd) > 20000 or re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", cmd):
        raise Decision(DENY, "commande trop longue ou contenant des caractères de contrôle")
    analyse_text(cmd, Ctx(cwd, roots))


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
