// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests of stop-gate.mjs, run with `node --test tools/dev/stop-gate.test.mjs` (Node 24).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, main, targets, words } from './stop-gate.mjs';

const deps = ({ pr = 17, code = 0, out = 'NOTHING\n', calls = [] } = {}) => ({
  currentPr: () => {
    if (pr === 'throw') throw new Error('no pull request');
    return pr;
  },
  signals: (n) => {
    calls.push(n);
    return { code, out };
  },
});

test('words: quotes kept together, separators split', () => {
  assert.deepEqual(words(`gh pr merge 5 --body "a b; c" && echo 'x y'`), [
    'gh',
    'pr',
    'merge',
    '5',
    '--body',
    'a b; c',
    ';',
    ';',
    'echo',
    'x y',
  ]);
});

test('ordinary commands pass without reading anything', () => {
  const calls = [];
  for (const command of [
    'git status',
    'gh pr view 17',
    'gh pr create --title "how to gh pr merge 5" --body x',
    'npm test',
    'echo "eas updated"',
    'git commit -m "Run eas update before the trial"',
    "cat > sheet.md <<'EOF'\nthe variant eas update publishes\ngh pr merge 5\nEOF\ngit add sheet.md",
    'grep -n "eas build" docs/METHOD.md',
    'gh api repos/Torof/flane/pulls/5/comments',
    undefined,
  ]) {
    assert.equal(decide(command, deps({ calls })).allow, true, command);
  }
  assert.deepEqual(calls, []);
});

test('merge targets: number anywhere among flags, #n, URL, current branch, several merges', () => {
  const cases = [
    ['gh pr merge 15 --merge --delete-branch', [15]],
    ['gh pr merge --merge 5', [5]],
    ['gh pr merge --merge --body "fixes 9" 5', [5]],
    ['gh pr merge #5', [5]],
    ['gh pr merge https://github.com/Torof/flane/pull/5', [5]],
    ['"gh" pr merge 5', [5]],
    ['/usr/bin/gh pr merge 5', [5]],
    ['gh pr merge --merge', ['current']],
    ['gh pr merge 17 && gh pr merge 5', [17, 5]],
    ['gh api -X PUT repos/Torof/flane/pulls/5/merge', [5]],
    ['gh pr merge 17 --merge --delete-branch 2>&1 | tail -1', [17]],
    ['gh pr merge 17 > /tmp/out.txt', [17]],
    ['gh pr merge 17 2>/dev/null', [17]],
    ['x=$(gh pr merge 5)', [5]],
    ["cat <<'A' && gh pr merge 7\nbody\nA", [7]],
    ['cat <<EOF\nEOF\ngh pr merge 5', [5]],
    ['bash -c "gh pr merge 5"', [5]],
    ["bash <<'EOF'\ngh pr merge 5\nEOF", [5]],
  ];
  for (const [command, prs] of cases)
    assert.deepEqual(targets(command), { prs, blocked: null }, command);
});

test('publish, build and submit: eas and eas-cli in every shape', () => {
  for (const command of [
    'cd app && eas update --channel preview',
    'node $(which eas) build --profile preview',
    'node "$(which eas)" update',
    'npx eas-cli update',
    'npx eas-cli@latest build',
    'eas update:republish --group x',
    'eas submit -p android',
    'eas workflow:run deploy.yml',
    '(cd app && eas update --channel preview)',
    'URL=$(eas update --branch preview --json)',
    'echo `eas update`',
    'echo "$(eas build)"',
    'cat <<EOF && eas update\nbody\nEOF',
    'bash -c "cd app && eas update"',
    "sh -c 'eas build'",
    "eval 'eas submit'",
    "bash <<'EOF'\ncd app\neas update\nEOF",
    'cd app; npx -y eas-cli@16.3.0 build -p android',
  ]) {
    assert.deepEqual(targets(command).prs, ['current'], command);
  }
});

test('what cannot be resolved is blocked', () => {
  assert.match(targets('gh pr merge some-branch').blocked, /not a pull request number/);
  assert.match(targets('gh -R x/y pr merge 5').blocked, /--repo/);
  assert.match(targets('gh --repo x/y pr merge 5').blocked, /--repo/);
  assert.match(targets('gh pr merge -R Torof/flane 5').blocked, /--repo/);
  assert.match(targets('echo 5 | xargs gh pr merge').blocked, /input/);
  assert.match(targets('gh pr merge <<< 5').blocked, /input/);
  assert.match(targets('gh pr merge < numbers.txt').blocked, /input/);
  assert.equal(decide('gh pr merge some-branch', deps()).allow, false);
});

test('every target is read; a stop or unreadable signals block, a request does not', () => {
  const calls = [];
  assert.equal(decide('gh pr merge 17 && gh pr merge 5', deps({ calls })).allow, true);
  assert.deepEqual(calls, [17, 5]);
  const stop = decide('gh pr merge 17', deps({ code: 1, out: 'STOP pr #17: stop\n' }));
  assert.equal(stop.allow, false);
  assert.match(stop.message, /STOP pr #17: stop/);
  assert.equal(decide('eas build', deps({ code: 2, out: 'UNREADABLE\n' })).allow, false);
  assert.equal(decide('eas build', deps({ code: null, out: '' })).allow, false);
  assert.equal(decide('gh pr merge 17', deps({ code: 3, out: 'REQUEST\n' })).allow, true);
});

test('no pull request found: blocked (fails closed)', () => {
  assert.equal(decide('eas update', deps({ pr: 'throw' })).allow, false);
  assert.equal(decide('gh pr merge', deps({ pr: 0 })).allow, false);
});

test('main: reads the hook JSON, exit 2 with a message on a block or any failure', () => {
  let err = '';
  const io = { stderr: (t) => (err += t) };
  const input = (command) => JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
  assert.equal(main(input('ls'), deps(), io), 0);
  assert.equal(main(input('gh pr merge 17'), deps({ code: 1, out: 'STOP\n' }), io), 2);
  assert.match(err, /block this command/);
  assert.equal(main('not json', deps(), io), 2);
  const broken = {
    currentPr: () => 17,
    signals: () => {
      throw new Error('boom');
    },
  };
  assert.equal(main(input('gh pr merge 17'), broken, io), 2);
});
