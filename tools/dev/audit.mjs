// SPDX-License-Identifier: AGPL-3.0-or-later
// Reads the JSON output of `npm audit --omit=dev --json`, keeps only the
// advisories (not the packages that are vulnerable by transitivity), and
// compares the high and critical ones with tools/dev/audit-accepted.json.
// An accepted advisory records how the package is reached (which packages
// require it, which direct dependencies lead to it): if that changes, the
// acceptance no longer holds. No dependency.
//
// Usage: node tools/dev/audit.mjs --audit <file|-> --lock <package-lock.json>
//          --accepted <audit-accepted.json> [--summary <file>] [--today YYYY-MM-DD]
// Exit code: 0 nothing blocking, 1 a high or critical advisory is not accepted
// (or its acceptance is stale), 2 the audit output is unusable (registry
// unreachable, invalid JSON).
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BLOCKING_SEVERITIES = new Set(['high', 'critical']);
export const REVIEW_AGE_DAYS = 90;
const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'info'];

/** Advisories of an `npm audit --json` report: one per (GHSA, package). */
export function parseAdvisories(report) {
  if (!report || typeof report !== 'object' || report.error || !report.vulnerabilities) {
    throw new Error('unusable audit report: ' + (report?.error?.summary ?? 'no "vulnerabilities" key'));
  }
  const byKey = new Map();
  for (const entry of Object.values(report.vulnerabilities)) {
    for (const via of entry.via ?? []) {
      if (typeof via !== 'object' || via === null || typeof via.url !== 'string') continue;
      const ghsa = via.url.split('/').pop();
      const key = `${ghsa} ${via.name}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          ghsa,
          package: via.name,
          severity: via.severity,
          range: via.range,
          title: via.title,
        });
      }
    }
  }
  return [...byKey.values()].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
      a.package.localeCompare(b.package),
  );
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

/**
 * How a package is reached in the production tree of a lockfile (v2 or v3):
 * `requiredBy` are the packages that require it directly, `reachableFrom` the
 * direct dependencies of the project that lead to it. Dev-only nodes are skipped.
 */
export function pathsOf(lock, packageName) {
  const packages = lock.packages ?? {};
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
  const targets = Object.keys(packages).filter((k) => k && nameOf(k) === packageName && !packages[k].dev);
  const requiredBy = new Set();
  const reachableFrom = new Set();
  const seen = new Set();
  const stack = [...targets];
  for (const t of targets) for (const p of parents.get(t) ?? []) if (p) requiredBy.add(nameOf(p));
  while (stack.length) {
    const node = stack.pop();
    if (seen.has(node)) continue;
    seen.add(node);
    for (const p of parents.get(node) ?? []) {
      if (p === '') reachableFrom.add(nameOf(node));
      else stack.push(p);
    }
  }
  return { requiredBy: [...requiredBy].sort(), reachableFrom: [...reachableFrom].sort() };
}

function sameList(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function daysBetween(from, to) {
  return Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/**
 * Compares advisories with the accepted list. Returns the blocking advisories,
 * the accepted ones (with a `reason` when the acceptance no longer holds), the
 * informative ones (lower severities), and the accepted entries to clean up.
 */
export function evaluate({ advisories, lock, accepted, today }) {
  const result = { blocking: [], accepted: [], informative: [], stale: [], old: [] };
  const acceptedByKey = new Map(accepted.map((e) => [`${e.ghsa} ${e.package}`, e]));
  const seenKeys = new Set();
  for (const adv of advisories) {
    const key = `${adv.ghsa} ${adv.package}`;
    const entry = acceptedByKey.get(key);
    const paths = pathsOf(lock, adv.package);
    if (entry) {
      seenKeys.add(key);
      const problems = [];
      if (entry.range !== adv.range) problems.push(`range changed: ${entry.range} → ${adv.range}`);
      if (!sameList(entry.requiredBy ?? [], paths.requiredBy)) {
        problems.push(`requiredBy changed: [${paths.requiredBy.join(', ')}]`);
      }
      if (!sameList(entry.reachableFrom ?? [], paths.reachableFrom)) {
        problems.push(`reachableFrom changed: [${paths.reachableFrom.join(', ')}]`);
      }
      if (daysBetween(entry.reviewed, today) > REVIEW_AGE_DAYS) {
        result.old.push({ ...adv, entry, age: daysBetween(entry.reviewed, today) });
      }
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
    if (!seenKeys.has(key)) result.stale.push(entry);
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
  if (r.stale.length) {
    out.push('', '### Entrées acceptées sans alerte correspondante (à retirer)');
    out.push(...r.stale.map((e) => `- ${e.ghsa} ${e.package}`));
  }
  return out.join('\n') + '\n';
}

function readJson(path) {
  const text = path === '-' ? readFileSync(0, 'utf8') : readFileSync(path, 'utf8');
  return JSON.parse(text);
}

function parseArgs(argv) {
  const args = { today: new Date().toISOString().slice(0, 10) };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i].replace(/^--/, '');
    if (!['audit', 'lock', 'accepted', 'summary', 'today'].includes(flag) || argv[i + 1] === undefined) {
      throw new Error(`usage: audit.mjs --audit <file|-> --lock <file> --accepted <file> [--summary <file>] [--today YYYY-MM-DD]`);
    }
    args[flag] = argv[i + 1];
  }
  for (const required of ['audit', 'lock', 'accepted']) {
    if (!args[required]) throw new Error(`missing --${required}`);
  }
  return args;
}

export function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    process.stderr.write(e.message + '\n');
    return 2;
  }
  let advisories, lock, accepted;
  try {
    advisories = parseAdvisories(readJson(args.audit));
    lock = readJson(args.lock);
    accepted = readJson(args.accepted);
    if (!Array.isArray(accepted)) throw new Error('audit-accepted.json must be an array');
  } catch (e) {
    const text = `## deps-check : INDÉTERMINÉ, rapport d’audit inutilisable\n\n${e.message}\n`;
    process.stdout.write(text);
    if (args.summary) appendFileSync(args.summary, text);
    return 2;
  }
  const result = evaluate({ advisories, lock, accepted, today: args.today });
  const text = renderSummary(result);
  process.stdout.write(text);
  if (args.summary) appendFileSync(args.summary, text);
  return result.blocking.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
