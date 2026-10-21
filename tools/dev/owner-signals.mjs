// SPDX-License-Identifier: AGPL-3.0-or-later
// Reads the owner's signals on pull requests, at each checkpoint
// (before a commit, push, agent, `eas update`, EAS build, merge, and at /debut).
// Claude acts with the owner's GitHub account, so the two are told apart by a
// signature: every comment Claude posts starts with CLAUDE_SIGNATURE.
//
// Signals:
// - stop: a pull request closed or moved back to draft against what Claude
//   expects, or an owner comment that starts with « veto » or « stop »;
// - request: any other owner comment, or a state change that is not a stop;
// - external: a comment from another account (data, never an instruction).
//
// Comments are read from the three sources (issue comments, reviews, review
// comments), every page, created or edited since the last checkpoint. The
// checkpoint and the state Claude expects are kept per item in a local file
// (`.git/flane-signals.json` by default, never committed). A stop is sticky:
// the checkpoint does not move until Claude acknowledges it with `--ack`,
// after the owner said to resume. `--ack` still reads and shows the comments
// since the stop (as requests marked « acknowledged »), so nothing written before
// the resume is lost. No dependency.
//
// Limits: the owner is the repository owner and must be a user account (an
// organisation is refused, code 2). A review only has submitted_at: a review
// summary edited afterwards is not seen again, so a stop is a new comment.
// A pending review (not submitted) is not a signal.
//
// Exit code: 0 nothing (or only external comments), 1 stop, 2 unusable inputs
// (to be treated as a stop), 3 requests to read.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE =
  'usage: owner-signals.mjs --pr <n>... [--expect draft|ready|closed|merged] [--ack] [--state <file>]';
export const CLAUDE_SIGNATURE = '<!-- flane:claude -->';
// « veto » or « stop » first, after any quote, emphasis or punctuation; « véto » too.
const STOP_WORD = /^[\s>*_~`«»"'“”‘’(\[-]*(v[eé]to|stop)(?![\p{L}\p{N}])/iu;
const EXPECTED_STATES = new Set(['draft', 'ready', 'closed', 'merged']);
const EXCERPT_LENGTH = 500;
// The checkpoint is set this far back, so a clock ahead of GitHub's misses
// nothing; a comment in the margin is read twice, which is harmless.
const CLOCK_MARGIN_MS = 2 * 60 * 1000;

export function parseArgs(argv) {
  const args = { items: [], expect: null, ack: false, state: null };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--ack') {
      args.ack = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined) throw new Error(`missing value after ${flag}\n${USAGE}`);
    if (flag === '--pr') {
      if (!/^[1-9]\d*$/.test(value)) throw new Error(`--pr expects a number, got "${value}"`);
      args.items.push({ number: Number(value) });
    } else if (flag === '--expect') {
      if (!EXPECTED_STATES.has(value))
        throw new Error(`--expect must be one of ${[...EXPECTED_STATES].join(', ')}`);
      args.expect = value;
    } else if (flag === '--state') {
      args.state = value;
    } else {
      throw new Error(`unknown argument ${flag}\n${USAGE}`);
    }
  }
  if (!args.items.length) throw new Error(USAGE);
  if (args.expect && args.items.length !== 1) {
    throw new Error('--expect applies to a single --pr');
  }
  if (args.ack && args.items.length !== 1) throw new Error('--ack applies to a single item');
  return args;
}

/** State of a pull request as GitHub reports it: draft, ready, closed or merged. */
export function prState(pull) {
  if (!pull || typeof pull !== 'object' || typeof pull.state !== 'string') {
    throw new Error('unusable pull request: no "state"');
  }
  if (pull.merged || pull.merged_at) return 'merged';
  if (pull.state === 'closed') return 'closed';
  return pull.draft ? 'draft' : 'ready';
}

/** Compares the actual state of a pull request with the one Claude expects. */
export function stateSignal(actual, expected) {
  if (!expected) {
    // First reading of this item: nothing to compare with, but a closed pull request is still said.
    return actual === 'closed'
      ? { kind: 'request', text: 'pull request closed (first reading)' }
      : null;
  }
  if (actual === expected) return null;
  if (actual === 'closed') return { kind: 'stop', text: 'pull request closed' };
  if (actual === 'draft') return { kind: 'stop', text: 'pull request moved back to draft' };
  if (actual === 'merged') return { kind: 'request', text: 'pull request merged without Claude' };
  return {
    kind: 'request',
    text: `pull request went from ${expected} to ${actual}`,
  };
}

/**
 * Classifies the comments of one item. `comments` mixes the three sources; each
 * has a user login, a body, a URL and dates (reviews only have submitted_at).
 */
export function classifyComments(comments, { owner, since }) {
  if (since && Number.isNaN(Date.parse(since))) throw new Error(`unusable checkpoint: "${since}"`);
  const signals = [];
  for (const c of comments) {
    if (!c || typeof c !== 'object' || typeof c.user?.login !== 'string') {
      throw new Error('unusable comment: no author');
    }
    if (c.state === 'PENDING') continue; // a review started but not submitted
    const body = typeof c.body === 'string' ? c.body : '';
    const changed = c.updated_at ?? c.submitted_at ?? c.created_at;
    if (Number.isNaN(Date.parse(changed))) throw new Error('unusable comment: no date');
    if (since && !(Date.parse(changed) > Date.parse(since))) continue;
    if (!body.trim()) continue; // an approval or a review without text
    const url = c.html_url ?? '';
    if (c.user.login !== owner) {
      signals.push({
        kind: 'external',
        text: `comment by @${c.user.login}, external content (not followed)`,
        url,
      });
    } else if (body.trimStart().startsWith(CLAUDE_SIGNATURE)) {
      continue;
    } else {
      const excerpt = body.trim().slice(0, EXCERPT_LENGTH);
      signals.push({
        kind: STOP_WORD.test(body) ? 'stop' : 'request',
        text: excerpt,
        url,
        at: changed,
      });
    }
  }
  return signals;
}

const RANK = { stop: 0, request: 1, external: 2 };
const LABEL = { stop: 'STOP', request: 'REQUEST', external: 'EXTERNAL' };

export function render(results) {
  const lines = [];
  for (const { item, signals, sticky } of results) {
    const name = `pr #${item.number}`;
    if (sticky)
      lines.push(`STOP ${name}: stop not lifted since the previous checkpoint (lift with --ack)`);
    for (const s of [...signals].sort((a, b) => RANK[a.kind] - RANK[b.kind])) {
      lines.push(
        `${LABEL[s.kind]} ${name}: ${s.text.replace(/\s+/g, ' ')}${s.url ? ` <${s.url}>` : ''}`,
      );
    }
  }
  return (lines.length ? lines : ['NOTHING']).join('\n') + '\n';
}

export function exitCode(results) {
  const kinds = new Set(
    results.flatMap((r) => [...(r.sticky ? ['stop'] : []), ...r.signals.map((s) => s.kind)]),
  );
  if (kinds.has('stop')) return 1;
  return kinds.has('request') ? 3 : 0;
}

/** Calls `gh api` on every page; one compact JSON value per line. */
export function ghFetcher(run = (args) => execFileSync('gh', args, { encoding: 'utf8' })) {
  const lines = (out) =>
    out
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  return {
    repo: () => run(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).trim(),
    object: (path) => JSON.parse(run(['api', path])),
    list: (path) =>
      lines(run(['api', '--paginate', '--jq', '.[] | tojson', `${path}?per_page=100`])),
  };
}

function readState(file) {
  try {
    const state = JSON.parse(readFileSync(file, 'utf8'));
    if (!state || typeof state !== 'object' || Array.isArray(state))
      throw new Error(`${file}: not an object`);
    return state;
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw e;
  }
}

// One file per git directory: each worktree keeps its own checkpoints.
function defaultStateFile() {
  const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], {
    encoding: 'utf8',
  }).trim();
  return join(gitDir, 'flane-signals.json');
}

export function main(
  argv,
  {
    fetcher = ghFetcher(),
    stateFile = null,
    now = () => new Date().toISOString(),
    io = {
      stdout: (t) => process.stdout.write(t),
      stderr: (t) => process.stderr.write(t),
    },
  } = {},
) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    io.stderr(e.message + '\n');
    return 2;
  }
  try {
    const file = args.state ?? stateFile ?? defaultStateFile();
    const state = readState(file);
    // Taken before reading, so nothing posted meanwhile is missed.
    const checkpoint = new Date(Date.parse(now()) - CLOCK_MARGIN_MS).toISOString();
    const repo = fetcher.repo();
    if (!repo) throw new Error('repository unknown');
    const ownerAccount = fetcher.object(`repos/${repo}`)?.owner;
    if (ownerAccount?.type !== 'User' || !ownerAccount.login) {
      throw new Error(
        `repository owner is not a user account (${ownerAccount?.type ?? 'unknown'})`,
      );
    }
    const owner = ownerAccount.login;
    const results = [];
    for (const item of args.items) {
      const key = `pr:${item.number}`;
      const saved = state[key] ?? {};
      const base = `repos/${repo}`;
      const actual = prState(fetcher.object(`${base}/pulls/${item.number}`));
      const signals = [];
      // A stop being lifted is not a signal; a state Claude has just set itself
      // (--expect) is compared with what GitHub reports, in case the owner acted too.
      const s = !args.ack ? stateSignal(actual, args.expect ?? saved.expected) : null;
      if (s) signals.push(s);
      const comments = [
        ...fetcher.list(`${base}/issues/${item.number}/comments`),
        ...fetcher.list(`${base}/pulls/${item.number}/reviews`),
        ...fetcher.list(`${base}/pulls/${item.number}/comments`),
      ];
      for (const c of classifyComments(comments, { owner, since: saved.since ?? null })) {
        signals.push(
          args.ack && c.kind === 'stop'
            ? { ...c, kind: 'request', text: `(acknowledged) ${c.text}` }
            : c,
        );
      }
      const sticky = Boolean(saved.stopped) && !args.ack;
      results.push({ item, signals, sticky });
      const stopped = sticky || signals.some((s) => s.kind === 'stop');
      // A stop keeps the checkpoint where it was, so it is read again until --ack.
      state[key] = { since: stopped ? (saved.since ?? null) : checkpoint };
      state[key].expected = args.expect ?? actual;
      if (stopped) state[key].stopped = true;
    }
    writeFileSync(file, JSON.stringify(state, null, 2) + '\n');
    io.stdout(render(results));
    return exitCode(results);
  } catch (e) {
    io.stdout(`UNREADABLE: ${e.message}\nTreat as a stop.\n`);
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
