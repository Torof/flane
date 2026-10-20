// SPDX-License-Identifier: AGPL-3.0-or-later
// Lists the licences of the production dependency tree of an npm project and
// flags anything outside the allowed list. No dependency: reads node_modules
// through `npm ls`. Usage: node tools/dev/licenses.mjs <project-directory>
// Exit code 1 if a licence is missing or not in the allowed list, 2 if the
// tree cannot be read (run `npm ci` first).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Permissive or weak-copyleft licences compatible with AGPL-3.0-or-later.
// CC-BY-4.0: data-only packages (caniuse-lite); Python-2.0: argparse, permissive.
export const ALLOWED = new Set([
  '0BSD',
  'Apache-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'CC-BY-4.0',
  'ISC',
  'MIT',
  'MIT-0',
  'MPL-2.0',
  'Python-2.0',
  'Unlicense',
  'Zlib',
]);

export function licenceOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ');
  return 'UNKNOWN';
}

/**
 * A SPDX expression is accepted if one of its OR alternatives has every AND
 * term in the allowed list. Nested parentheses are refused rather than guessed.
 */
export function isAllowed(expr) {
  const trimmed = expr.trim();
  const outer = /^\((.*)\)$/.exec(trimmed);
  const body = outer ? outer[1] : trimmed;
  if (body.includes('(') || body.includes(')')) return false;
  return body
    .split(/\s+OR\s+/i)
    .some((alt) => alt.split(/\s+AND\s+/i).every((l) => ALLOWED.has(l.trim())));
}

function main() {
  const project = resolve(process.argv[2] ?? '.');
  let output;
  try {
    output = execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], {
      cwd: project,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    console.error(`Cannot read the dependency tree of ${project}. Run \`npm ci\` there first.`);
    process.exit(2);
  }
  const paths = [...new Set(output.split('\n').filter((p) => p && p !== project))];

  const counts = new Map();
  const rejected = [];
  for (const p of paths) {
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(join(p, 'package.json'), 'utf8'));
    } catch {
      rejected.push(`${p}: no readable package.json`);
      continue;
    }
    const licence = licenceOf(pkg);
    counts.set(licence, (counts.get(licence) ?? 0) + 1);
    if (!isAllowed(licence)) rejected.push(`${pkg.name}@${pkg.version}: ${licence}`);
  }

  console.log(`Production packages: ${paths.length}`);
  for (const [licence, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(n).padStart(5)}  ${licence}`);
  }
  if (rejected.length > 0) {
    console.log('\nNot in the allowed list:');
    for (const r of rejected) console.log(`  ${r}`);
    process.exit(1);
  }
  console.log('\nAll licences are in the allowed list.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
