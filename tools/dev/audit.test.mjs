// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests of audit.mjs, run with `node --test tools/dev/audit.test.mjs` (Node 24).
// The fixtures mirror the real shape of `npm audit --json` (v2 report): a
// package vulnerable by transitivity has strings in `via`, an advisory has an object.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluate, main, parseAdvisories, pathsOf, renderSummary, validateAccepted } from './audit.mjs';

const advisory = (ghsa, name, severity, range) => ({
  source: 1,
  name,
  dependency: name,
  title: `${name} is vulnerable`,
  url: `https://github.com/advisories/${ghsa}`,
  severity,
  cwe: [],
  cvss: { score: 7.5, vectorString: '' },
  range,
});

const vulnerable = (name, severity, via, effects) => ({
  name,
  severity,
  isDirect: false,
  via,
  effects,
  range: '*',
  nodes: [`node_modules/${name}`],
  fixAvailable: false,
});

const report = {
  auditReportVersion: 2,
  vulnerabilities: {
    braces: vulnerable('braces', 'high', [advisory('GHSA-vfj7-8cjw-p6xm', 'braces', 'high', '<=3.0.3')], ['micromatch']),
    micromatch: vulnerable('micromatch', 'high', ['braces'], ['tool']),
    tool: vulnerable('tool', 'high', ['micromatch'], []),
    uuid: vulnerable('uuid', 'moderate', [advisory('GHSA-w5hq-g745-h8pq', 'uuid', 'moderate', '<11.1.1')], ['tool']),
  },
  metadata: { vulnerabilities: { high: 3, moderate: 1 } },
};

// Project → tool → micromatch → braces ; tool → uuid ; a dev-only package also
// requires braces but must not count ; `nested` has its own copy of uuid.
const lock = {
  lockfileVersion: 3,
  packages: {
    '': { dependencies: { tool: '1.0.0', nested: '1.0.0' }, devDependencies: { devtool: '1.0.0' } },
    'node_modules/tool': { version: '1.0.0', dependencies: { micromatch: '4.0.0', uuid: '7.0.3' } },
    'node_modules/micromatch': { version: '4.0.0', dependencies: { braces: '3.0.3' } },
    'node_modules/braces': { version: '3.0.3' },
    'node_modules/uuid': { version: '7.0.3' },
    'node_modules/nested': { version: '1.0.0', dependencies: { uuid: '9.0.0' } },
    'node_modules/nested/node_modules/uuid': { version: '9.0.0' },
    'node_modules/devtool': { version: '1.0.0', dev: true, dependencies: { braces: '3.0.3' } },
  },
};

const acceptedBraces = {
  ghsa: 'GHSA-vfj7-8cjw-p6xm',
  package: 'braces',
  range: '<=3.0.3',
  requiredBy: ['micromatch'],
  reachableFrom: ['tool'],
  reason: 'tooling only',
  reviewed: '2026-10-20',
};

const run = (overrides = {}) =>
  evaluate({ advisories: parseAdvisories(report), lock, accepted: [], today: '2026-10-20', ...overrides });

test('parseAdvisories keeps advisories only, never the transitively vulnerable packages', () => {
  assert.deepEqual(
    parseAdvisories(report).map((a) => [a.ghsa, a.package, a.severity]),
    [
      ['GHSA-vfj7-8cjw-p6xm', 'braces', 'high'],
      ['GHSA-w5hq-g745-h8pq', 'uuid', 'moderate'],
    ],
  );
});

test('parseAdvisories refuses an unusable report', () => {
  assert.throws(() => parseAdvisories({ error: { summary: 'registry unreachable' } }), /registry unreachable/);
  assert.throws(() => parseAdvisories({}), /unusable/);
  assert.throws(() => parseAdvisories(null), /unusable/);
});

test('pathsOf follows node resolution, skips dev-only nodes, merges nested copies', () => {
  assert.deepEqual(pathsOf(lock, 'braces'), { requiredBy: ['micromatch'], reachableFrom: ['tool'] });
  assert.deepEqual(pathsOf(lock, 'uuid'), { requiredBy: ['nested', 'tool'], reachableFrom: ['nested', 'tool'] });
  assert.deepEqual(pathsOf(lock, 'absent'), { requiredBy: [], reachableFrom: [] });
});

test('a high advisory that is not accepted blocks; a moderate one is informative', () => {
  const r = run();
  assert.deepEqual(
    r.blocking.map((a) => [a.package, a.reason]),
    [['braces', 'not accepted']],
  );
  assert.deepEqual(
    r.informative.map((a) => a.package),
    ['uuid'],
  );
  assert.match(renderSummary(r), /^## deps-check: RED, 1 high or critical advisory/);
});

test('an accepted advisory with the same paths passes', () => {
  const r = run({ accepted: [acceptedBraces] });
  assert.equal(r.blocking.length, 0);
  assert.deepEqual(r.accepted[0].problems, []);
  assert.equal(r.old.length, 0);
  assert.match(renderSummary(r), /^## deps-check: green \(1 accepted/);
});

test('an accepted advisory whose paths changed blocks again', () => {
  const movedLock = structuredClone(lock);
  movedLock.packages['node_modules/nested'].dependencies.braces = '3.0.3';
  const r = run({ lock: movedLock, accepted: [acceptedBraces] });
  assert.equal(r.blocking.length, 1);
  assert.match(r.blocking[0].reason, /requiredBy changed: \[micromatch, nested\]/);
  assert.match(r.blocking[0].reason, /reachableFrom changed: \[nested, tool\]/);
});

test('an accepted advisory whose vulnerable range widened blocks again', () => {
  const r = run({ accepted: [{ ...acceptedBraces, range: '<=3.0.2' }] });
  assert.match(r.blocking[0].reason, /range changed: <=3.0.2 → <=3.0.3/);
});

test('a moderate acceptance whose paths changed is reported without blocking', () => {
  const acceptedUuid = {
    ...acceptedBraces,
    ghsa: 'GHSA-w5hq-g745-h8pq',
    package: 'uuid',
    range: '<11.1.1',
    requiredBy: ['tool'],
    reachableFrom: ['tool'],
  };
  const r = run({ accepted: [acceptedBraces, acceptedUuid] });
  assert.equal(r.blocking.length, 0);
  const uuid = r.accepted.find((a) => a.package === 'uuid');
  assert.match(uuid.problems.join(' '), /requiredBy changed: \[nested, tool\]/);
  assert.match(renderSummary(r), /to review: requiredBy changed/);
});

test('an old acceptance is reported but does not block', () => {
  const r = run({ accepted: [acceptedBraces], today: '2027-02-01' });
  assert.equal(r.blocking.length, 0);
  assert.equal(r.old.length, 1);
  assert.match(renderSummary(r), /Acceptances older than 90 days/);
});

test('an accepted entry without a matching advisory is reported as unmatched', () => {
  const r = run({ accepted: [acceptedBraces, { ...acceptedBraces, ghsa: 'GHSA-gone-gone-gone', package: 'gone' }] });
  assert.deepEqual(
    r.unmatched.map((e) => e.package),
    ['gone'],
  );
  assert.match(renderSummary(r), /without a matching advisory/);
});

test('an advisory without a GHSA identifier or with an unknown severity blocks', () => {
  const odd = {
    vulnerabilities: {
      a: vulnerable('a', 'low', [{ ...advisory('GHSA-aaaa-bbbb-cccc', 'a', 'low', '*'), url: 'https://example.invalid' }], []),
      b: vulnerable('b', 'weird', [advisory('GHSA-dddd-eeee-ffff', 'b', 'weird', '*')], []),
    },
  };
  const r = evaluate({ advisories: parseAdvisories(odd), lock, accepted: [], today: '2026-10-20' });
  assert.deepEqual(
    r.blocking.map((a) => a.reason).sort(),
    ['advisory without a GHSA identifier', 'unknown severity "weird"'],
  );
});

test('validateAccepted lists every malformed field', () => {
  assert.doesNotThrow(() => validateAccepted([acceptedBraces]));
  assert.throws(() => validateAccepted({}), /must be an array/);
  assert.throws(
    () => validateAccepted([{ ...acceptedBraces, ghsa: 'nope', reviewed: '2026-13-45', requiredBy: 'micromatch' }]),
    (e) => /ghsa must be/.test(e.message) && /reviewed must be/.test(e.message) && /requiredBy must be/.test(e.message),
  );
});

// --- main(): files on disk, captured output, exit codes.
function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'flane-audit-'));
  const paths = {};
  for (const [name, content] of Object.entries(files)) {
    paths[name] = join(dir, name);
    writeFileSync(paths[name], typeof content === 'string' ? content : JSON.stringify(content));
  }
  paths.summary = join(dir, 'summary.md');
  return paths;
}

function runMain(paths, extra = []) {
  let out = '';
  let err = '';
  const code = main(
    [
      '--audit', paths['audit.json'], '--lock', paths['lock.json'], '--accepted', paths['accepted.json'],
      '--summary', paths.summary, '--today', '2026-10-20', ...extra,
    ],
    { stdout: (t) => (out += t), stderr: (t) => (err += t) },
  );
  return { code, out, err };
}

test('main returns 1 on a blocking advisory and writes the summary file', () => {
  const paths = fixture({ 'audit.json': report, 'lock.json': lock, 'accepted.json': [] });
  const { code, out } = runMain(paths);
  assert.equal(code, 1);
  assert.match(out, /^## deps-check: RED/);
  assert.equal(readFileSync(paths.summary, 'utf8'), out);
});

test('main returns 0 when every high advisory is accepted', () => {
  const paths = fixture({ 'audit.json': report, 'lock.json': lock, 'accepted.json': [acceptedBraces] });
  assert.equal(runMain(paths).code, 0);
});

test('main returns 2 on a registry error, an empty or invalid file, a malformed accepted list', () => {
  const registry = fixture({
    'audit.json': { error: { code: 'ENOTFOUND', summary: 'registry unreachable' } },
    'lock.json': lock,
    'accepted.json': [],
  });
  const r1 = runMain(registry);
  assert.equal(r1.code, 2);
  assert.match(r1.out, /^## deps-check: UNDETERMINED/);
  assert.match(r1.out, /registry unreachable/);
  assert.match(readFileSync(registry.summary, 'utf8'), /UNDETERMINED/);

  const empty = fixture({ 'audit.json': '', 'lock.json': lock, 'accepted.json': [] });
  assert.equal(runMain(empty).code, 2);

  const badLock = fixture({ 'audit.json': report, 'lock.json': { lockfileVersion: 1 }, 'accepted.json': [] });
  assert.match(runMain(badLock).out, /without a "packages" map/);

  const badAccepted = fixture({ 'audit.json': report, 'lock.json': lock, 'accepted.json': { ghsa: 'x' } });
  assert.match(runMain(badAccepted).out, /must be an array/);
});

test('main returns 2 on bad arguments without touching the summary', () => {
  const paths = fixture({ 'audit.json': report, 'lock.json': lock, 'accepted.json': [] });
  const unknown = runMain(paths, ['--bogus', 'x']);
  assert.equal(unknown.code, 2);
  assert.match(unknown.err, /usage:/);
  const missingValue = runMain(paths, ['--today']);
  assert.equal(missingValue.code, 2);
  const badDate = runMain(paths, ['--today', 'yesterday']);
  assert.match(badDate.err, /--today must be/);
  let out = '';
  assert.equal(main([], { stdout: (t) => (out += t), stderr: () => {} }), 2);
  assert.equal(out, '');
});
