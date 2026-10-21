// SPDX-License-Identifier: AGPL-3.0-or-later
// Claude Code PreToolUse hook: before Claude merges a pull request or publishes
// or builds the app (`gh pr merge`, `eas update`, `eas build`), reads the
// owner's stop signals and blocks the command on a stop. Makes the veto a
// barrier instead of a rule Claude must remember (docs/METHOD.md). It reads
// with --dry-run, so the checkpoint Claude takes itself is unchanged.
//
// Input: the hook JSON on stdin ({ tool_name, tool_input: { command } }).
// Exit code: 0 allow, 2 block (stderr is shown to Claude). Fails closed: a
// guarded command whose pull request cannot be found, or whose signals cannot
// be read, is blocked. No dependency.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GUARDED = [/\bgh\s+pr\s+merge\b/, /\beas\)?\s+(update|build)\b/];

/** Decides for one shell command. `deps` reaches GitHub; tests replace it. */
export function decide(command, deps) {
  if (typeof command !== 'string' || !GUARDED.some((re) => re.test(command))) {
    return { allow: true };
  }
  const explicit = /\bgh\s+pr\s+merge\s+#?(\d+)\b/.exec(command)?.[1];
  let pr;
  try {
    pr = explicit ? Number(explicit) : deps.currentPr();
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
  if (code === 1 || code === 2) {
    return {
      allow: false,
      message: `stop-gate: the owner's signals block this command (pr #${pr}).\n${out}`,
    };
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
        }).trim(),
      ),
    signals: (pr) => {
      const r = spawnSync(process.execPath, [script, '--pr', String(pr), '--dry-run'], {
        encoding: 'utf8',
      });
      return { code: r.status ?? 2, out: (r.stdout ?? '') + (r.stderr ?? '') };
    },
  };
}

export function main(input, deps = realDeps(), io = { stderr: (t) => process.stderr.write(t) }) {
  let command;
  try {
    command = JSON.parse(input)?.tool_input?.command;
  } catch {
    io.stderr('stop-gate: unreadable hook input.\n');
    return 2;
  }
  const result = decide(command, deps);
  if (result.allow) return 0;
  io.stderr(result.message + '\n');
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(readFileSync(0, 'utf8'));
}
