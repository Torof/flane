// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests of check-version-bump.mjs, run with `node --test tools/dev/check-version-bump.test.mjs` (Node 24).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appChanges, evaluate, isHigher, parseVersion, render } from './check-version-bump.mjs';

const pkg = (version, extra = {}) =>
  JSON.stringify({
    name: 'flane',
    version,
    dependencies: { expo: '58.0.0' },
    devDependencies: { jest: '30.0.0' },
    scripts: { test: 'jest' },
    ...extra,
  });
const lock = (version, packages = {}) =>
  JSON.stringify({
    name: 'flane',
    version,
    lockfileVersion: 3,
    packages: {
      '': { version, dependencies: { expo: '58.0.0' }, devDependencies: { jest: '30.0.0' } },
      ...packages,
    },
  });

/** A reader over two snapshots of the files. */
const reader = (base, head) => (path, side) => (side === 'base' ? base : head)[path] ?? null;

const baseFiles = {
  'app/package.json': pkg('0.0.2'),
  'app/package-lock.json': lock('0.0.2', { 'node_modules/expo': { version: '58.0.0' } }),
};

test('parseVersion and isHigher: strictly greater, x.y.z only', () => {
  assert.deepEqual(parseVersion('0.1.10'), [0, 1, 10]);
  assert.throws(() => parseVersion('0.1'), /x\.y\.z/);
  assert.throws(() => parseVersion('v0.1.0'), /x\.y\.z/);
  assert.equal(isHigher('0.0.3', '0.0.2'), true);
  assert.equal(isHigher('0.1.0', '0.0.9'), true);
  assert.equal(isHigher('0.0.10', '0.0.9'), true);
  assert.equal(isHigher('0.0.2', '0.0.2'), false);
  assert.equal(isHigher('0.0.1', '0.0.2'), false);
});

test('code changed without a bump: red; with a bump: green', () => {
  const changed = ['app/src/app/index.tsx'];
  const red = evaluate({ changedFiles: changed, read: reader(baseFiles, baseFiles) });
  assert.equal(red.ok, false);
  assert.match(render(red), /RED/);
  const head = { ...baseFiles, 'app/package.json': pkg('0.0.3') };
  assert.equal(
    evaluate({ changedFiles: [...changed, 'app/package.json'], read: reader(baseFiles, head) }).ok,
    true,
  );
});

test('equal, lower or malformed version: red or unusable', () => {
  const changed = ['app/app.config.ts', 'app/package.json'];
  for (const v of ['0.0.2', '0.0.1']) {
    const head = { ...baseFiles, 'app/package.json': pkg(v) };
    assert.equal(evaluate({ changedFiles: changed, read: reader(baseFiles, head) }).ok, false, v);
  }
  const bad = { ...baseFiles, 'app/package.json': pkg('1.0') };
  assert.throws(() => evaluate({ changedFiles: changed, read: reader(baseFiles, bad) }), /x\.y\.z/);
  const broken = { ...baseFiles, 'app/package.json': '{ not json' };
  assert.throws(() => evaluate({ changedFiles: changed, read: reader(baseFiles, broken) }));
});

test('only tests, tools tests, docs, lint and format config, dev dependencies or scripts: green', () => {
  const head = {
    'app/package.json': pkg('0.0.2', {
      devDependencies: { jest: '30.1.0' },
      scripts: { test: 'jest --ci' },
    }),
    'app/package-lock.json': lock('0.0.2', {
      'node_modules/expo': { version: '58.0.0' },
      'node_modules/jest': { version: '30.1.0', dev: true },
    }),
  };
  const changed = [
    'app/src/config.test.ts',
    'app/src/__mocks__/x.ts',
    'app/jest.setup.js',
    'app/src/tools/licenses.test.ts',
    'app/src/tools/helper.ts',
    'app/README.md',
    'app/eslint.config.js',
    'app/.prettierrc',
    'app/.nvmrc',
    'app/.npmrc',
    'app/package.json',
    'app/package-lock.json',
    'docs/METHOD.md',
  ];
  const result = evaluate({ changedFiles: changed, read: reader(baseFiles, head) });
  assert.deepEqual(result.reasons, []);
  assert.equal(result.ok, true);
});

test('production dependencies, production lock entries or eas.json: a bump is required', () => {
  const deps = {
    ...baseFiles,
    'app/package.json': pkg('0.0.2', { dependencies: { expo: '58.0.1' } }),
  };
  assert.deepEqual(appChanges(['app/package.json'], reader(baseFiles, deps)), [
    'app/package.json (outside devDependencies, scripts, jest)',
  ]);
  const lockHead = {
    ...baseFiles,
    'app/package-lock.json': lock('0.0.2', { 'node_modules/expo': { version: '58.0.1' } }),
  };
  assert.deepEqual(appChanges(['app/package-lock.json'], reader(baseFiles, lockHead)), [
    'app/package-lock.json (production entries)',
  ]);
  assert.deepEqual(appChanges(['app/eas.json'], reader(baseFiles, baseFiles)), ['app/eas.json']);
});

test('the version bump alone does not count as a change', () => {
  const head = {
    'app/package.json': pkg('0.0.3'),
    'app/package-lock.json': lock('0.0.3', { 'node_modules/expo': { version: '58.0.0' } }),
  };
  assert.deepEqual(
    appChanges(['app/package.json', 'app/package-lock.json'], reader(baseFiles, head)),
    [],
  );
});
