// SPDX-License-Identifier: AGPL-3.0-or-later
// Reads the JSON output of `npm audit --omit=dev --json`, keeps only the
// advisories (not the packages that are vulnerable by transitivity), and
// compares the high and critical ones with tools/dev/audit-accepted.json.
// An accepted advisory records how the package is reached (which packages
// require it, which direct dependencies lead to it): if that changes, the
// acceptance no longer holds. No dependency.
//
// Exit code: 0 nothing blocking, 1 a high or critical advisory is not accepted
// (or its acceptance no longer holds), 2 the inputs are unusable (registry
// unreachable, invalid JSON, malformed accepted list, bad arguments).
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const USAGE =
  'usage: audit.mjs --audit <file|-> --lock <package-lock.json> --accepted <audit-accepted.json>' +
  ' [--summary <file>] [--today YYYY-MM-DD]';
export const REVIEW_AGE_DAYS = 90;
const BLOCKING_SEVERITIES = new Set(['high', 'critical']);
const SEVERITIES = ['critical', 'high', 'moderate', 'low', 'info'];
const GHSA = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Advisories of an `npm audit --json` report: one per (GHSA, package). */
export function parseAdvisories(report) {
  if (!report || typeof report !== 'object' || report.error || !report.vulnerabilities) {
    throw new Error('unusable audit report: ' + (report?.error?.summary ?? 'no "vulnerabilities" key'));
  }
  const byKey = new Map();
  for (const entry of Object.values(report.vulnerabilities)) {
    for (const via of entry.via ?? []) {
      if (typeof via !== 'object' || via === null) continue; // a string names a parent package
      const ghsa = GHSA.exec(String(via.url ?? ''))?.[0] ?? `unknown(${via.name ?? '?'})`;
      const key = `${ghsa} ${via.name}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          ghsa,
          package: String(via.name ?? '?'),
          severity: String(via.severity ?? 'unknown'),
          range: String(via.range ?? '?'),
          title: String(via.title ?? ''),
        });
      }
    }
  }
  const rank = (s) => (SEVERITIES.includes(s) ? SEVERITIES.indexOf(s) : -1);
  return [...byKey.values()].sort(
    (a, b) => rank(a.severity) - rank(b.severity) || a.package.localeCompare(b.package),
  );
}

/** Checks the shape of audit-accepted.json; throws with every problem found. */
export function validateAccepted(accepted) {
  if (!Array.isArray(accepted)) throw new Error('audit-accepted.json must be an array');
  const problems = [];
  const isStringList = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');
  accepted.forEach((e, i) => {
    const where = `entry ${i} (${e?.ghsa ?? '?'} ${e?.package ?? '?'})`;
    if (!e || typeof e !== 'object') return problems.push(`${where}: not an object`);
    if (!GHSA.test(String(e.ghsa))) problems.push(`${where}: ghsa must be a GHSA identifier`);
    for (const field of ['package', 'range', 'reason']) {
      if (typeof e[field] !== 'string' || !e[field]) problems.push(`${where}: ${field} must be a non-empty string`);
    }
    for (const field of ['requiredBy', 'reachableFrom']) {
      if (!isStringList(e[field])) problems.push(`${where}: ${field} must be a list of package names`);
    }
    if (!DATE.test(String(e.reviewed)) || Number.isNaN(Date.parse(e.reviewed))) {
      problems.push(`${where}: reviewed must be a date YYYY-MM-DD`);
    }
  });
  if (problems.length) throw new Error('malformed audit-accepted.json:\n' + problems.join('\n'));
}

/** Resolves the lockfile key of `dep` as seen from the package at `from` (node resolution). */
function resolveDependency(packages, from, dep) {
  let base = from;
  for (;;) {
    const candidate = base ? `${base}/node_modules/${dep}` : `node_modules/${dep}`;
    if (packages[candidate]) return candidate;
    if (!base) return null;
    const i = base.lastIndexOf('/node_modules/');
    base = i === -1 ? '' : base.slice(0, i);
  }
}

function nameOf(key) {
  return key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
}

/** Map from a lockfile key to the keys of the production packages that require it ('' is the project). */
function buildParentMap(packages) {
  const parents = new Map();
  for (const [key, pkg] of Object.entries(packages)) {
    if (pkg.dev) continue;
    const deps = Object.keys(pkg.dependencies ?? {}).concat(
      Object.keys(pkg.optionalDependencies ?? {}),
      Object.keys(pkg.peerDependencies ?? {}),
    );
    for (const dep of deps) {
      const target = resolveDependency(packages, key, dep);
      if (!target || packages[target].dev) continue;
      if (!parents.has(target)) parents.set(target, new Set());
      parents.get(target).add(key);
    }
  }
  return parents;
}

/** Names of the direct dependencies of the project from which one of `targets` is reachable. */
function walkToRoot(parents, targets) {
  const reachableFrom = new Set();
  const seen = new Set();
  const stack = [...targets];
  while (stack.length) {
    const node = stack.pop();
    if (seen.has(node)) continue;
    seen.add(node);
    for (const parent of parents.get(node) ?? []) {
      if (parent === '') reachableFrom.add(nameOf(node));
      else stack.push(parent);
    }
  }
  return reachableFrom;
}

/**
 * How a package is reached in the production tree of a lockfile (v2 or v3):
 * `requiredBy` are the packages that require it directly, `reachableFrom` the
 * direct dependencies of the project that lead to it. Dev-only nodes are skipped.
 */
export function pathsOf(lock, packageName) {
  const packages = lock.packages ?? {};
  const parents = buildParentMap(packages);
  const targets = Object.keys(packages).filter((k) => k && nameOf(k) === packageName && !packages[k].dev);
  const requiredBy = new Set();
  for (const t of targets) for (const p of parents.get(t) ?? []) if (p) requiredBy.add(nameOf(p));
  return { requiredBy: [...requiredBy].sort(), reachableFrom: [...walkToRoot(parents, targets)].sort() };
}

function sameList(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function daysBetween(from, to) {
  return Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** Why an accepted entry no longer matches the advisory as it is today. */
function acceptanceProblems(entry, advisory, paths) {
  const problems = [];
  if (entry.range !== advisory.range) problems.push(`range changed: ${entry.range} → ${advisory.range}`);
  if (!sameList(entry.requiredBy, paths.requiredBy)) {
    problems.push(`requiredBy changed: [${paths.requiredBy.join(', ')}]`);
  }
  if (!sameList(entry.reachableFrom, paths.reachableFrom)) {
    problems.push(`reachableFrom changed: [${paths.reachableFrom.join(', ')}]`);
  }
  return problems;
}

/**
 * Compares advisories with the accepted list. Returns the blocking advisories
 * (with a `reason`), the accepted ones (with `problems` when the acceptance no
 * longer holds), the informative ones (lower severities), the acceptances older
 * than REVIEW_AGE_DAYS, and the accepted entries without a matching advisory.
 */
export function evaluate({ advisories, lock, accepted, today }) {
  const result = { blocking: [], accepted: [], informative: [], old: [], unmatched: [] };
  const acceptedByKey = new Map(accepted.map((e) => [`${e.ghsa} ${e.package}`, e]));
  const seenKeys = new Set();
  for (const adv of advisories) {
    const key = `${adv.ghsa} ${adv.package}`;
    const entry = acceptedByKey.get(key);
    const paths = pathsOf(lock, adv.package);
    if (!SEVERITIES.includes(adv.severity)) {
      result.blocking.push({ ...adv, paths, reason: `unknown severity "${adv.severity}"` });
    } else if (adv.ghsa.startsWith('unknown(')) {
      result.blocking.push({ ...adv, paths, reason: 'advisory without a GHSA identifier' });
    } else if (entry) {
      seenKeys.add(key);
      const problems = acceptanceProblems(entry, adv, paths);
      const age = daysBetween(entry.reviewed, today);
      if (age > REVIEW_AGE_DAYS) result.old.push({ ...adv, entry, age });
      if (problems.length && BLOCKING_SEVERITIES.has(adv.severity)) {
        result.blocking.push({ ...adv, paths, reason: `accepted, but ${problems.join('; ')}` });
      } else {
        result.accepted.push({ ...adv, entry, paths, problems });
      }
    } else if (BLOCKING_SEVERITIES.has(adv.severity)) {
      result.blocking.push({ ...adv, paths, reason: 'not accepted' });
    } else {
      result.informative.push({ ...adv, paths });
    }
  }
  for (const [key, entry] of acceptedByKey) {
    if (!seenKeys.has(key)) result.unmatched.push(entry);
  }
  return result;
}

function line(adv) {
  const reach = adv.paths
    ? ` — requis par ${adv.paths.requiredBy.join(', ') || '?'} ; depuis ${adv.paths.reachableFrom.join(', ') || '?'}`
    : '';
  return `- ${adv.ghsa} ${adv.package} ${adv.range} (${adv.severity}) : ${adv.title}${reach}`;
}

/** Markdown summary; the first line names the outcome. */
export function renderSummary(r) {
  const out = [];
  out.push(
    r.blocking.length
      ? `## deps-check : ROUGE, ${r.blocking.length} alerte(s) haute(s) ou critique(s) non acceptée(s)`
      : `## deps-check : vert (${r.accepted.length} acceptée(s), ${r.informative.length} informative(s))`,
  );
  if (r.blocking.length) {
    out.push('', '### Bloquantes', ...r.blocking.map((a) => `${line(a)} — ${a.reason}`));
    out.push(
      '',
      'Corriger la dépendance, ou, si le paquet ne tourne pas dans l’appli, l’accepter dans ' +
        '`tools/dev/audit-accepted.json` avec ses chemins et la date (voir `docs/CONVENTIONS.md`).',
    );
  }
  if (r.accepted.length) {
    out.push('', '### Acceptées (outillage, hors appli)');
    for (const a of r.accepted) {
      out.push(`${line(a)} — revue le ${a.entry.reviewed} : ${a.entry.reason}`);
      for (const p of a.problems) out.push(`  - à revoir : ${p}`);
    }
  }
  if (r.informative.length) out.push('', '### Modérées et basses (informatives)', ...r.informative.map(line));
  if (r.old.length) {
    out.push('', `### Acceptations de plus de ${REVIEW_AGE_DAYS} jours (à revoir)`);
    out.push(...r.old.map((a) => `- ${a.ghsa} ${a.package} : revue le ${a.entry.reviewed} (${a.age} jours)`));
  }
  if (r.unmatched.length) {
    out.push('', '### Entrées acceptées sans alerte correspondante (à retirer)');
    out.push(...r.unmatched.map((e) => `- ${e.ghsa} ${e.package}`));
  }
  return out.join('\n') + '\n';
}

function readJson(path) {
  return JSON.parse(readFileSync(path === '-' ? 0 : path, 'utf8'));
}

function parseArgs(argv) {
  const args = { today: new Date().toISOString().slice(0, 10) };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    if (!['audit', 'lock', 'accepted', 'summary', 'today'].includes(flag) || value === undefined) {
      throw new Error(USAGE);
    }
    args[flag] = value;
  }
  for (const required of ['audit', 'lock', 'accepted']) {
    if (!args[required]) throw new Error(`missing --${required}\n${USAGE}`);
  }
  if (!DATE.test(args.today)) throw new Error(`--today must be YYYY-MM-DD\n${USAGE}`);
  return args;
}

/** Writes the text to stdout and, when given, appends it to the summary file. */
function emit(text, summaryPath, io) {
  io.stdout(text);
  if (summaryPath) appendFileSync(summaryPath, text);
}

/** Runs the command line; returns the exit code. `io` can be replaced in tests. */
export function main(argv, io = { stdout: (t) => process.stdout.write(t), stderr: (t) => process.stderr.write(t) }) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    io.stderr(e.message + '\n');
    return 2;
  }
  let advisories, lock, accepted;
  try {
    advisories = parseAdvisories(readJson(args.audit));
    lock = readJson(args.lock);
    if (!lock || typeof lock !== 'object' || typeof lock.packages !== 'object') {
      throw new Error('package-lock.json without a "packages" map (lockfile v2 or v3 expected)');
    }
    accepted = readJson(args.accepted);
    validateAccepted(accepted);
  } catch (e) {
    emit(`## deps-check : INDÉTERMINÉ, entrées inutilisables\n\n${e.message}\n`, args.summary, io);
    return 2;
  }
  const result = evaluate({ advisories, lock, accepted, today: args.today });
  emit(renderSummary(result), args.summary, io);
  return result.blocking.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
