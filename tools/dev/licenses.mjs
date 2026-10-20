// SPDX-License-Identifier: AGPL-3.0-or-later
// Lists the licences of the production dependency tree of an npm project and
// flags anything outside the allowed list. No dependency: reads node_modules
// through `npm ls`. Usage: node tools/dev/licenses.mjs <project-directory>
// Exit code 1 if a licence is missing or not in the allowed list.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Permissive or weak-copyleft licences compatible with AGPL-3.0-or-later.
const ALLOWED = new Set([
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

const project = resolve(process.argv[2] ?? '.');
const output = execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], {
  cwd: project,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const paths = [...new Set(output.split('\n').filter((p) => p && p !== project))];

function licenceOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ');
  return 'UNKNOWN';
}

/** A SPDX expression is accepted if one of its alternatives is allowed. */
function isAllowed(expr) {
  const cleaned = expr.replace(/[()]/g, '');
  const alternatives = cleaned.split(/\s+OR\s+/i);
  return alternatives.some((alt) => alt.split(/\s+AND\s+/i).every((l) => ALLOWED.has(l.trim())));
}

const counts = new Map();
const rejected = [];
for (const p of paths) {
  const pkg = JSON.parse(readFileSync(join(p, 'package.json'), 'utf8'));
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
