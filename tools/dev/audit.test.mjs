// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests of audit.mjs, run with `node --test tools/dev/audit.test.mjs` (Node 24). The fixtures mirror
// the real shape of `npm audit --json` (v2 report): a package vulnerable by
// transitivity has strings in `via`, an advisory has an object.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseAdvisories, pathsOf, renderSummary } from './audit.mjs';

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

const report = {
  auditReportVersion: 2,
  vulnerabilities: {
    braces: {
      name: 'braces',
      severity: 'high',
      isDirect: false,
      via: [advisory('GHSA-vfj7-8cjw-p6xm', 'braces', 'high', '<=3.0.3')],
      effects: ['micromatch'],
      range: '*',
      nodes: ['node_modules/braces'],
      fixAvailable: false,
    },
    micromatch: {
      name: 'micromatch',
      severity: 'high',
      isDirect: false,
      via: ['braces'],
      effects: ['tool'],
      range: '*',
      nodes: ['node_modules/micromatch'],
      fixAvailable: false,
    },
    tool: {
      name: 'tool',
      severity: 'high',
      isDirect: true,
      via: ['micromatch'],
      effects: [],
      range: '*',
      nodes: ['node_modules/tool'],
      fixAvailable: false,
    },
    uuid: {
      name: 'uuid',
      severity: 'moderate',
      isDirect: false,
      via: [advisory('GHSA-w5hq-g745-h8pq', 'uuid', 'moderate', '<11.1.1')],
      effects: ['tool'],
      range: '*',
      nodes: ['node_modules/uuid'],
      fixAvailable: false,
    },
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

test('parseAdvisories keeps advisories only, never the transitively vulnerable packages', () => {
  const advisories = parseAdvisories(report);
  assert.deepEqual(
    advisories.map((a) => [a.ghsa, a.package, a.severity]),
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

test('a high advisory that is not accepted blocks', () => {
  const r = evaluate({ advisories: parseAdvisories(report), lock, accepted: [], today: '2026-10-20' });
  assert.equal(r.blocking.length, 1);
  assert.equal(r.blocking[0].package, 'braces');
  assert.equal(r.blocking[0].reason, 'not accepted');
  assert.deepEqual(
    r.informative.map((a) => a.package),
    ['uuid'],
  );
  assert.match(renderSummary(r), /^## deps-check : ROUGE, 1 alerte/);
});

test('an accepted advisory with the same paths passes', () => {
  const r = evaluate({
    advisories: parseAdvisories(report),
    lock,
    accepted: [acceptedBraces],
    today: '2026-10-20',
  });
  assert.equal(r.blocking.length, 0);
  assert.equal(r.accepted.length, 1);
  assert.deepEqual(r.accepted[0].problems, []);
  assert.equal(r.old.length, 0);
  assert.match(renderSummary(r), /^## deps-check : vert \(1 acceptée/);
});

test('an accepted advisory whose paths changed blocks again', () => {
  const movedLock = structuredClone(lock);
  movedLock.packages['node_modules/nested'].dependencies.braces = '3.0.3';
  const r = evaluate({
    advisories: parseAdvisories(report),
    lock: movedLock,
    accepted: [acceptedBraces],
    today: '2026-10-20',
  });
  assert.equal(r.blocking.length, 1);
  assert.match(r.blocking[0].reason, /requiredBy changed: \[micromatch, nested\]/);
  assert.match(r.blocking[0].reason, /reachableFrom changed: \[nested, tool\]/);
});

test('an accepted advisory whose vulnerable range widened blocks again', () => {
  const r = evaluate({
    advisories: parseAdvisories(report),
    lock,
    accepted: [{ ...acceptedBraces, range: '<=3.0.2' }],
    today: '2026-10-20',
  });
  assert.equal(r.blocking.length, 1);
  assert.match(r.blocking[0].reason, /range changed: <=3.0.2 → <=3.0.3/);
});

test('an old acceptance is reported but does not block', () => {
  const r = evaluate({
    advisories: parseAdvisories(report),
    lock,
    accepted: [acceptedBraces],
    today: '2027-02-01',
  });
  assert.equal(r.blocking.length, 0);
  assert.equal(r.old.length, 1);
  assert.match(renderSummary(r), /Acceptations de plus de 90 jours/);
});

test('an accepted entry without a matching advisory is reported as stale', () => {
  const r = evaluate({
    advisories: parseAdvisories(report),
    lock,
    accepted: [acceptedBraces, { ...acceptedBraces, ghsa: 'GHSA-gone', package: 'gone' }],
    today: '2026-10-20',
  });
  assert.equal(r.stale.length, 1);
  assert.equal(r.stale[0].package, 'gone');
  assert.match(renderSummary(r), /sans alerte correspondante/);
});

test('a moderate advisory never blocks, even unaccepted', () => {
  const moderateOnly = { vulnerabilities: { uuid: report.vulnerabilities.uuid } };
  const r = evaluate({ advisories: parseAdvisories(moderateOnly), lock, accepted: [], today: '2026-10-20' });
  assert.equal(r.blocking.length, 0);
  assert.equal(r.informative.length, 1);
});
