// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests of check-version-bump.mjs, run with `node --test tools/dev/check-version-bump.test.mjs` (Node 24).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  appChanges,
  evaluate,
  isHigher,
  main,
  parseChangedFiles,
  parseVersion,
  render,
} from './check-version-bump.mjs';

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
    'app/package.json',
    'app/package-lock.json',
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
    'app/package.json (outside devDependencies, jest and non-build scripts)',
  ]);
  const hook = {
    ...baseFiles,
    'app/package.json': pkg('0.0.2', { scripts: { test: 'jest', postinstall: 'node x.js' } }),
  };
  assert.equal(appChanges(['app/package.json'], reader(baseFiles, hook)).length, 1);
  const easHook = {
    ...baseFiles,
    'app/package.json': pkg('0.0.2', { scripts: { test: 'jest', 'eas-build-pre-install': 'x' } }),
  };
  assert.equal(appChanges(['app/package.json'], reader(baseFiles, easHook)).length, 1);
  assert.deepEqual(appChanges(['app/.npmrc'], reader(baseFiles, baseFiles)), ['app/.npmrc']);
  assert.deepEqual(appChanges(['app/assets/icon.test.png'], reader(baseFiles, baseFiles)), [
    'app/assets/icon.test.png',
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

test('a base package.json without a version is unusable; no base package.json is a first version', () => {
  const noVersion = { ...baseFiles, 'app/package.json': JSON.stringify({ name: 'flane' }) };
  const head = { ...baseFiles, 'app/package.json': pkg('0.0.3') };
  assert.throws(() => evaluate({ changedFiles: ['app/src/x.ts'], read: reader(noVersion, head) }));
  assert.equal(evaluate({ changedFiles: ['app/src/x.ts'], read: reader({}, head) }).ok, true);
});

test('parseChangedFiles: NUL-separated raw names, accents kept, anything outside app/ refused', () => {
  assert.deepEqual(parseChangedFiles('app/src/carré.ts\0app/a b.ts\0'), [
    'app/src/carré.ts',
    'app/a b.ts',
  ]);
  assert.throws(() => parseChangedFiles('"app/src/carr\\303\\251.ts"\0'), /unexpected path/);
});

/** Runs main() in a temporary git repository: base commit, then `change(dir)` committed on top. */
function onRepo(change) {
  const dir = join(mkdtempSync(join(tmpdir(), 'version-check-')), 'Flâne repo');
  mkdirSync(join(dir, 'app/src'), { recursive: true });
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'test');
  git('config', 'commit.gpgsign', 'false');
  writeFileSync(join(dir, 'app/package.json'), pkg('0.0.2'));
  writeFileSync(join(dir, 'app/src/feature.ts'), 'export const a = 1;\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  const base = git('rev-parse', 'HEAD').trim();
  change(dir);
  git('add', '-A');
  git('commit', '-q', '-m', 'change');
  const previous = process.cwd();
  let out = '';
  try {
    process.chdir(dir);
    const code = main(['--base', base], { stdout: (t) => (out += t), stderr: (t) => (out += t) });
    return { code, out };
  } finally {
    process.chdir(previous);
    rmSync(dirname(dir), { recursive: true, force: true });
  }
}

test('end to end: an accented file name counts', () => {
  const { code, out } = onRepo((dir) =>
    writeFileSync(join(dir, 'app/src/carré.ts'), 'export {};\n'),
  );
  assert.equal(code, 1, out);
  assert.match(out, /app\/src\/carré\.ts/);
});

test('end to end: moving a shipped file into an ignored place still counts', () => {
  const toTools = onRepo((dir) => {
    mkdirSync(join(dir, 'app/src/tools'));
    renameSync(join(dir, 'app/src/feature.ts'), join(dir, 'app/src/tools/feature.ts'));
  });
  assert.equal(toTools.code, 1, toTools.out);
  assert.match(toTools.out, /app\/src\/feature\.ts/);
  const toTest = onRepo((dir) =>
    renameSync(join(dir, 'app/src/feature.ts'), join(dir, 'app/src/feature.test.ts')),
  );
  assert.equal(toTest.code, 1, toTest.out);
});

test('end to end: a test-only change stays green', () => {
  const { code, out } = onRepo((dir) =>
    writeFileSync(join(dir, 'app/src/feature.test.ts'), 'test("x", () => {});\n'),
  );
  assert.equal(code, 0, out);
});
