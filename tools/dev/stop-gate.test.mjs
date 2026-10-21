// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests of stop-gate.mjs, run with `node --test tools/dev/stop-gate.test.mjs` (Node 24).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, main } from './stop-gate.mjs';

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

test('ordinary commands pass without reading anything', () => {
  const calls = [];
  for (const command of [
    'git status',
    'gh pr view 17',
    'npm test',
    'echo "eas updated"',
    undefined,
  ]) {
    assert.equal(decide(command, deps({ calls })).allow, true);
  }
  assert.deepEqual(calls, []);
});

test('merge, publish and build are read against the right pull request', () => {
  const calls = [];
  assert.equal(decide('gh pr merge 15 --merge --delete-branch', deps({ calls })).allow, true);
  assert.equal(decide('gh pr merge --merge', deps({ calls })).allow, true);
  assert.equal(decide('cd app && eas update --channel preview', deps({ calls })).allow, true);
  assert.equal(decide('node $(which eas) build --profile preview', deps({ calls })).allow, true);
  assert.equal(decide('eas update:republish --group x', deps({ calls })).allow, true);
  assert.deepEqual(calls, [15, 17, 17, 17, 17]);
});

test('a stop or unreadable signals block, a request does not', () => {
  const stop = decide('gh pr merge 17', deps({ code: 1, out: 'STOP pr #17: stop\n' }));
  assert.equal(stop.allow, false);
  assert.match(stop.message, /STOP pr #17: stop/);
  assert.equal(decide('eas build', deps({ code: 2, out: 'UNREADABLE\n' })).allow, false);
  assert.equal(decide('gh pr merge 17', deps({ code: 3, out: 'REQUEST\n' })).allow, true);
});

test('no pull request found: blocked (fails closed)', () => {
  assert.equal(decide('eas update', deps({ pr: 'throw' })).allow, false);
  assert.equal(decide('gh pr merge', deps({ pr: 0 })).allow, false);
});

test('main: reads the hook JSON, exit 2 with a message on a block', () => {
  let err = '';
  const io = { stderr: (t) => (err += t) };
  const input = (command) => JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
  assert.equal(main(input('ls'), deps(), io), 0);
  assert.equal(main(input('gh pr merge 17'), deps({ code: 1, out: 'STOP\n' }), io), 2);
  assert.match(err, /block this command/);
  assert.equal(main('not json', deps(), io), 2);
});
