// SPDX-License-Identifier: AGPL-3.0-or-later
// Claude Code PreToolUse hook: before Claude merges a pull request or
// publishes, builds or submits the app, reads the owner's stop signals and
// blocks the command on a stop (docs/METHOD.md). It reads with --dry-run, so
// the checkpoint Claude takes itself is unchanged.
//
// A seatbelt against forgetting, not a sandbox: a command held in a variable,
// written to a script file and run, or an edit of this script, gets around it.
// What it catches: `gh … pr merge` (flags anywhere, number, `#n` or `/pull/n`),
// `gh api` on `pulls/<n>/merge`, and `eas` or `eas-cli` `update`, `build`,
// `submit`, `workflow:run`, in every part of a compound command, inside `$(…)`
// and backticks, in the argument of `sh -c`/`bash -c`/`zsh -c` and `eval`, and in
// a here-document fed to a shell. Quoted text and other here-documents are data:
// they are not read. It blocks what it cannot resolve: a merge target that is
// not a number, `-R`/`--repo`, arguments from `xargs` or `<<<`, a guarded
// command with no pull request for the branch.
//
// Input: the hook JSON on stdin ({ tool_name, tool_input: { command } }).
// Exit code: 0 allow, 2 block (stderr is shown to Claude). Every failure blocks.
// No dependency.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// A program word (once `(`, `$(` and `)` are trimmed) and the subcommand after it.
const EAS_PROGRAM = /(^|[/\s])eas(-cli)?(@[^/\s]*)?$/;
const EAS_SUBCOMMAND = /^(update|build|submit|workflow:run)(:|$)/;
const clean = (w) => w.replace(/^\$?\(+/, '').replace(/\)+$/, '');
// gh pr merge flags that take a value.
const VALUE_FLAGS = new Set([
  '-R',
  '--repo',
  '-b',
  '--body',
  '-F',
  '--body-file',
  '-t',
  '--subject',
  '-A',
  '--author-email',
  '--match-head-commit',
]);

/** Splits a shell command into words, honouring quotes; separators become their own words. */
export function words(command) {
  const out = [];
  let word = '';
  let quote = null;
  const flush = () => {
    if (word) out.push(word);
    word = '';
  };
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) quote = null;
      else word += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (';&|\n'.includes(ch)) {
      flush();
      out.push(';');
    } else if (/\s/.test(ch)) {
      flush();
    } else {
      word += ch;
    }
  }
  flush();
  return out;
}

const SHELL = /^(.*\/)?(ba|z|da)?sh$/;

/**
 * Removes here-document bodies (text fed to a command, not a command) and keeps
 * the opener line. A body fed to a shell or to `eval` is kept: it is commands.
 */
export function withoutHeredocs(command) {
  return command.replace(
    /([^\n]*?)<<-?\s*(['"]?)([A-Za-z_]\w*)\2([^\n]*)\n(?:[\s\S]*?\n)?[\t ]*\3[\t ]*(?=\n|$)/g,
    (match, before, _q, _tag, after) => {
      const feeder =
        words(before)
          .filter((w) => w !== ';')
          .at(-1) ?? '';
      if (SHELL.test(clean(feeder)) || feeder === 'eval') return match;
      return `${before}${after}`;
    },
  );
}

/** The insides of `$(…)` and backticks: commands the shell runs, even inside double quotes. */
export function substitutions(command) {
  const inner = [];
  for (const m of command.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)) inner.push(m[1] ?? m[2]);
  return inner;
}

/** The targets of one command: { prs: [n | 'current'], blocked: reason | null }. */
export function targets(command, depth = 0) {
  if (depth > 3) return { prs: [], blocked: 'command nested too deep to check' };
  const prs = [];
  for (const inner of substitutions(command)) {
    const sub = targets(inner, depth + 1);
    if (sub.blocked) return sub;
    prs.push(...sub.prs);
  }
  const all = words(withoutHeredocs(command)).map((w) => (w === ';' ? w : clean(w)));
  const segments = [];
  let current = [];
  for (const w of all) {
    if (w === ';') {
      if (current.length) segments.push(current);
      current = [];
    } else current.push(w);
  }
  if (current.length) segments.push(current);

  for (const seg of segments) {
    // The argument of `sh -c` and the rest of an `eval` are commands too.
    const sh = seg.findIndex((w) => SHELL.test(w));
    const nested = [];
    if (sh >= 0 && /^-[a-z]*c[a-z]*$/.test(seg[sh + 1] ?? '') && seg[sh + 2] !== undefined) {
      nested.push(seg[sh + 2]);
    }
    if (seg.includes('eval')) nested.push(seg.slice(seg.indexOf('eval') + 1).join(' '));
    for (const inner of nested) {
      const sub = targets(inner, depth + 1);
      if (sub.blocked) return sub;
      prs.push(...sub.prs);
    }
    const gh = seg.findIndex((w) => /(^|\/)gh$/.test(w));
    if (gh >= 0) {
      const rest = seg.slice(gh + 1);
      const pr = rest.indexOf('pr');
      if (pr >= 0 && rest[pr + 1] === 'merge') {
        if (seg.slice(0, gh).includes('xargs') || rest.some((w) => /^\d*</.test(w))) {
          return {
            prs,
            blocked: 'merge arguments read from input (xargs, <, <<<) are not checked',
          };
        }
        if (rest.some((w) => w === '-R' || w === '--repo' || w.startsWith('--repo='))) {
          return {
            prs,
            blocked: 'a merge with -R/--repo is not checked; merge from the repository itself',
          };
        }
        const args = rest.slice(pr + 2);
        const positional = [];
        for (let i = 0; i < args.length; i++) {
          if (VALUE_FLAGS.has(args[i])) i++;
          else if (/^\d*[<>]+$/.test(args[i]))
            i++; // a redirection and its target
          else if (/^\d*[<>]/.test(args[i]))
            continue; // a redirection with its target attached
          else if (!args[i].startsWith('-')) positional.push(args[i]);
        }
        if (!positional.length) prs.push('current');
        for (const p of positional) {
          const n = /^#?(\d+)$/.exec(p)?.[1] ?? /\/pull\/(\d+)\b/.exec(p)?.[1];
          if (!n) return { prs, blocked: `merge target "${p}" is not a pull request number` };
          prs.push(Number(n));
        }
      }
      if (rest[0] === 'api' || rest.includes('api')) {
        for (const w of rest) {
          const n = /pulls\/(\d+)\/merge\b/.exec(w)?.[1];
          if (n) prs.push(Number(n));
        }
      }
    }
  }
  for (let i = 0; i < all.length - 1; i++) {
    if (EAS_PROGRAM.test(all[i]) && EAS_SUBCOMMAND.test(all[i + 1])) {
      prs.push('current');
      break;
    }
  }
  return { prs, blocked: null };
}

/** Decides for one shell command. `deps` reaches GitHub; tests replace it. */
export function decide(command, deps) {
  if (typeof command !== 'string') return { allow: true };
  const { prs, blocked } = targets(command);
  if (blocked) return { allow: false, message: `stop-gate: ${blocked}.` };
  for (const target of new Set(prs)) {
    let pr;
    try {
      pr = target === 'current' ? deps.currentPr() : target;
    } catch {
      pr = null;
    }
    if (!pr) {
      return {
        allow: false,
        message:
          'stop-gate: no pull request found for this branch. Merge, publish and build from a pull request.',
      };
    }
    const { code, out } = deps.signals(pr);
    if (code !== 0 && code !== 3) {
      return {
        allow: false,
        message: `stop-gate: the owner's signals block this command (pr #${pr}).\n${out}`,
      };
    }
  }
  return { allow: true };
}

function realDeps() {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'owner-signals.mjs');
  return {
    currentPr: () =>
      Number(
        execFileSync('gh', ['pr', 'view', '--json', 'number', '--jq', '.number'], {
          encoding: 'utf8',
          timeout: 15000,
        }).trim(),
      ),
    signals: (pr) => {
      const r = spawnSync(process.execPath, [script, '--pr', String(pr), '--dry-run'], {
        encoding: 'utf8',
        timeout: 40000,
      });
      // A timeout leaves status null: treated as unreadable, so it blocks.
      return { code: r.status ?? 2, out: (r.stdout ?? '') + (r.stderr ?? '') };
    },
  };
}

export function main(input, deps = realDeps(), io = { stderr: (t) => process.stderr.write(t) }) {
  try {
    const command = JSON.parse(input)?.tool_input?.command;
    const result = decide(command, deps);
    if (result.allow) return 0;
    io.stderr(result.message + '\n');
    return 2;
  } catch (e) {
    io.stderr(`stop-gate: ${e.message}. Blocked.\n`);
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exitCode = main(readFileSync(0, 'utf8'));
  } catch {
    process.exitCode = 2;
  }
}
