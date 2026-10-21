// SPDX-License-Identifier: AGPL-3.0-or-later
// version-check: a pull request that changes the app must raise the app
// version (app/package.json) above the one of its base (D-029,
// docs/CONVENTIONS.md). Closed by default: every file under app/ counts,
// except the ones listed in DOES_NOT_COUNT; in app/package.json only the
// sections that change nothing in the app are ignored (install and build
// hooks in `scripts` do count), and in app/package-lock.json only the
// development entries and the type-only packages (`@types/*`, `undici-types`,
// never aliased, linked or with an install script). Renames count as a deletion plus an addition, and file
// names are read raw (-z), accents included. No dependency.
//
// Not a security boundary: a pull request can edit this script to pass itself;
// the security pass reads changes to the checks line by line.
//
// Exit code: 0 nothing to bump or bumped, 1 the app changed without a higher
// version, 2 unusable inputs (unreadable package.json, bad arguments).
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const USAGE = 'usage: check-version-bump.mjs --base <sha> [--summary <file>]';
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
const DOES_NOT_COUNT = [
  /\.test\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /(^|\/)__mocks__\//,
  /(^|\/)jest\.setup\.(ts|js|mjs|cjs)$/,
  /^app\/src\/tools\//,
  /^app\/(.*\/)?[^/]+\.md$/,
  /^app\/eslint\.config\.(js|mjs|cjs|ts)$/,
  /^app\/\.eslintrc[^/]*$/,
  /^app\/\.prettierrc[^/]*$/,
  /^app\/\.prettierignore$/,
  /^app\/\.nvmrc$/,
];
// package.json sections that change nothing in the app (version is compared apart).
const PACKAGE_IGNORED = ['devDependencies', 'scripts', 'jest', 'version'];
// Scripts that run when the app is installed or built (npm lifecycle, EAS Build hooks).
const BUILD_SCRIPT = /^(preinstall|install|postinstall|prepare|prepack|postpack|eas-build-.+)$/;

export function parseVersion(text) {
  const m = VERSION.exec(String(text ?? ''));
  if (!m) throw new Error(`version "${text}" is not x.y.z`);
  return m.slice(1).map(Number);
}

export function isHigher(head, base) {
  const [h, b] = [parseVersion(head), parseVersion(base)];
  for (let i = 0; i < 3; i++) if (h[i] !== b[i]) return h[i] > b[i];
  return false;
}

const without = (obj, keys) =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([k]) => !keys.includes(k)));
const buildScripts = (pkg) =>
  Object.fromEntries(Object.entries(pkg?.scripts ?? {}).filter(([k]) => BUILD_SCRIPT.test(k)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Packages made only of type declarations: never in the assembled app, even when
// npm counts them as production because a production tool (Jest, Metro) requires them.
const TYPES_ONLY = /(^|\/)node_modules\/(@types\/[^/]+|undici-types)$/;
// Only the real package: not an npm alias (its `name` differs from its path),
// a local link, or anything with an install script.
const isTypesOnly = (path, entry) =>
  TYPES_ONLY.test(path) &&
  (entry.name === undefined || path.endsWith(`node_modules/${entry.name}`)) &&
  !entry.link &&
  !entry.hasInstallScript;

/** The part of a lockfile that ships: non-dev, non-type entries, without the project's own version. */
export function productionLock(lock) {
  const packages = {};
  for (const [path, entry] of Object.entries(lock?.packages ?? {})) {
    if (path === '') packages[path] = { dependencies: entry.dependencies ?? {} };
    else if (!entry.dev && !isTypesOnly(path, entry)) packages[path] = entry;
  }
  return packages;
}

/** Splits the output of `git diff -z --name-only`; every name must be under app/. */
export function parseChangedFiles(output) {
  const files = output.split('\0').filter(Boolean);
  const outside = files.find((f) => !f.startsWith('app/'));
  if (outside !== undefined)
    throw new Error(`unexpected path in the diff: ${JSON.stringify(outside)}`);
  return files;
}

/**
 * Why the app counts as changed: a list of reasons (empty = nothing that ships).
 * `read(path, side)` returns the file text on 'base' or 'head', or null if absent.
 */
export function appChanges(changedFiles, read) {
  const reasons = [];
  for (const file of changedFiles) {
    if (DOES_NOT_COUNT.some((re) => re.test(file))) continue;
    if (file === 'app/package.json') {
      const [base, head] = ['base', 'head'].map((side) => JSON.parse(read(file, side) ?? '{}'));
      if (
        !same(without(base, PACKAGE_IGNORED), without(head, PACKAGE_IGNORED)) ||
        !same(buildScripts(base), buildScripts(head))
      ) {
        reasons.push('app/package.json (outside devDependencies, jest and non-build scripts)');
      }
    } else if (file === 'app/package-lock.json') {
      const [base, head] = ['base', 'head'].map((side) => JSON.parse(read(file, side) ?? '{}'));
      if (!same(productionLock(base), productionLock(head))) {
        reasons.push('app/package-lock.json (production entries)');
      }
    } else {
      reasons.push(file);
    }
  }
  return reasons;
}

export function evaluate({ changedFiles, read }) {
  const reasons = appChanges(changedFiles, read);
  const baseText = read('app/package.json', 'base');
  const base = baseText == null ? null : JSON.parse(baseText).version;
  if (baseText != null) parseVersion(base); // a base package.json must carry a version
  const head = JSON.parse(read('app/package.json', 'head') ?? 'null')?.version;
  parseVersion(head); // a malformed head version is refused even when nothing counts
  if (!reasons.length) return { ok: true, reasons, base, head };
  return { ok: base == null || isHigher(head, base), reasons, base, head };
}

export function render({ ok, reasons, base, head }) {
  if (!reasons.length)
    return `## version-check : green, the app does not change (version ${head})\n`;
  const list = reasons
    .slice(0, 20)
    .map((r) => `- ${r}`)
    .join('\n');
  return ok
    ? `## version-check : green, ${base ?? 'none'} → ${head}\n\nThe app changes:\n${list}\n`
    : `## version-check : RED, the app changes but the version stays ${head} (base ${base})\n\nRaise app/package.json above ${base} (D-029). The app changes:\n${list}\n`;
}

function gitReader(baseSha) {
  return (path, side) => {
    try {
      return execFileSync('git', ['show', `${side === 'base' ? baseSha : 'HEAD'}:${path}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      return null;
    }
  };
}

export function main(
  argv,
  io = { stdout: (t) => process.stdout.write(t), stderr: (t) => process.stderr.write(t) },
) {
  let base = null;
  let summary = null;
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--base') base = argv[i + 1];
    else if (argv[i] === '--summary') summary = argv[i + 1];
    else {
      io.stderr(`${USAGE}\n`);
      return 2;
    }
  }
  if (!base || !/^[0-9a-f]{7,40}$/.test(base)) {
    io.stderr(`${USAGE}\n`);
    return 2;
  }
  const emit = (text) => {
    io.stdout(text);
    try {
      if (summary) appendFileSync(summary, text);
    } catch {
      // the summary is a convenience; the exit code is the verdict
    }
  };
  try {
    const output = execFileSync(
      'git',
      ['diff', '-z', '--name-only', '--no-renames', `${base}...HEAD`, '--', 'app'],
      { encoding: 'utf8' },
    );
    const result = evaluate({ changedFiles: parseChangedFiles(output), read: gitReader(base) });
    emit(render(result));
    return result.ok ? 0 : 1;
  } catch (e) {
    emit(`## version-check : UNDETERMINED, unusable inputs\n\n${e.message}\n`);
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
