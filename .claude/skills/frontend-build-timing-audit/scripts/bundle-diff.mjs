#!/usr/bin/env node
// Compare two production builds of `react-ui` to diagnose chunk-evaluation
// timing bugs. Two modes:
//
//   --ref-a / --ref-b              compare two git refs (HEAD, main, sha, etc.)
//   --patch-a / --patch-b          apply optional patch files on top of the
//                                  refs (combine with --ref-* to set up
//                                  controlled multi-variable experiments)
//
// For each variant the script:
//   1) Cleans dist/ and Vite's cache.
//   2) Builds with `nx build react-ui --skip-nx-cache`.
//   3) Copies the output to /tmp/bundle-diff-<label>/.
//
// Then compares:
//   - Total chunk count
//   - Entry chunk size & hash
//   - Static-import dependency list of the entry chunk
//   - Which chunk contains each marker string (--marker, repeatable)
//   - Critical-path size (raw / gzipped / brotli) — entry chunk plus all
//     statically-imported sibling chunks (the bytes the browser must finish
//     loading+executing before the app body runs)
//
// Usage:
//   node bundle-diff.mjs \
//     --label-a 'main'   --ref-a main \
//     --label-b 'HEAD'   --ref-b HEAD \
//     --marker 'View input data' \
//     --marker 'Some other UI label that went missing'
//
// IMPORTANT: this script checks out files via `git restore --source=<ref>`,
// runs builds against the local workspace, then restores HEAD at the end.
// It refuses to run if you have uncommitted changes (use `git stash` first).

import { execSync } from 'node:child_process';
import { rmSync, cpSync } from 'node:fs';
import { analyzeBuild } from './lib/analyze.mjs';

function parseArgs(argv) {
  const out = { markers: [], variants: { a: {}, b: {} } };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--label-a') out.variants.a.label = next();
    else if (a === '--label-b') out.variants.b.label = next();
    else if (a === '--ref-a') out.variants.a.ref = next();
    else if (a === '--ref-b') out.variants.b.ref = next();
    else if (a === '--patch-a') out.variants.a.patch = next();
    else if (a === '--patch-b') out.variants.b.patch = next();
    else if (a === '--marker') out.markers.push(next());
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error(`Unknown arg: ${a}`); printHelp(); process.exit(2); }
  }
  if (!out.variants.a.ref && !out.variants.a.patch) {
    out.variants.a.ref = 'HEAD~1';
    out.variants.a.label = out.variants.a.label || 'HEAD~1';
  }
  if (!out.variants.b.ref && !out.variants.b.patch) {
    out.variants.b.ref = 'HEAD';
    out.variants.b.label = out.variants.b.label || 'HEAD';
  }
  out.variants.a.label = out.variants.a.label || 'A';
  out.variants.b.label = out.variants.b.label || 'B';
  return out;
}

function printHelp() {
  console.log(`Usage:
  node bundle-diff.mjs \\
    --label-a 'main'   --ref-a main \\
    --label-b 'HEAD'   --ref-b HEAD \\
    --marker 'View input data'

  --ref-X    git ref to check out for variant X (default: HEAD~1 and HEAD)
  --patch-X  optional patch file to apply on top of ref-X
  --label-X  display label (default: ref/patch name)
  --marker   string to locate within chunks; repeatable

Outputs the comparison report to stdout. Build artifacts saved to
/tmp/bundle-diff-<label>/ for inspection.`);
}

const args = parseArgs(process.argv);

const cwd = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
process.chdir(cwd);

// Refuse to run with a dirty working tree.
const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
if (dirty) {
  console.error('Working tree is dirty. Commit, stash, or revert before running.');
  console.error('Files:\n' + dirty);
  process.exit(2);
}

const originalRef = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
const originalSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', encoding: 'utf8', ...opts });
}

function build(variant) {
  const { label, ref, patch } = variant;
  console.error(`\n=== Building variant '${label}' (ref=${ref || 'HEAD'}, patch=${patch || '-'}) ===`);

  if (ref) {
    // Restore the entire tracked tree to the target ref but keep .git/HEAD
    // pointing where it was (avoids detached-HEAD churn). Restoring the full
    // tree (not just `packages/`) so root configs (vite.config.ts edge
    // cases, lockfile, tsconfig, etc.) and any patch files outside
    // `packages/` are picked up too.
    sh(`git restore --source=${ref} -- .`, { silent: true });
  }
  if (patch) {
    sh(`git apply --whitespace=nowarn ${patch}`);
  }
  rmSync(`${cwd}/dist/packages/react-ui`, { recursive: true, force: true });
  rmSync(`${cwd}/node_modules/.vite/packages/react-ui`, { recursive: true, force: true });
  sh(`npx nx build react-ui --skip-nx-cache 2>&1 | tail -3`, { shell: '/bin/bash' });

  const outDir = `/tmp/bundle-diff-${label.replace(/[^A-Za-z0-9_-]+/g, '_')}`;
  rmSync(outDir, { recursive: true, force: true });
  cpSync(`${cwd}/dist/packages/react-ui`, outDir, { recursive: true });
  console.error(`  saved to ${outDir}`);
  return outDir;
}

function restore() {
  // Wipe variant changes across the full tracked tree (paired with the
  // wider `git restore -- .` in build()). Required so a patch that touches
  // files outside `packages/` cannot leak past the script.
  sh('git checkout -- .', { silent: true });
}

let dirA, dirB;
try {
  dirA = build(args.variants.a);
  restore();
  dirB = build(args.variants.b);
  restore();
} catch (e) {
  console.error('Build failed; attempting to restore tree.');
  try { restore(); } catch {}
  throw e;
}

const reportA = { label: args.variants.a.label, ...analyzeBuild(dirA, args.markers) };
const reportB = { label: args.variants.b.label, ...analyzeBuild(dirB, args.markers) };

// ---------- Output ----------
function kb(n) { return (n / 1024).toFixed(1) + ' KB'; }
function delta(a, b) {
  const d = b - a;
  const sign = d > 0 ? '+' : '';
  return `${sign}${kb(d)} (${sign}${(100 * d / (a || 1)).toFixed(1)}%)`;
}

console.log('\n========== BUNDLE DIFF ==========');
console.log(`\n${'Metric'.padEnd(28)}  ${reportA.label.padStart(20)}  ${reportB.label.padStart(20)}  Δ`);
console.log('-'.repeat(110));
const row = (m, a, b, fmt = kb) =>
  console.log(`${m.padEnd(28)}  ${String(fmt(a)).padStart(20)}  ${String(fmt(b)).padStart(20)}  ${delta(a, b)}`);
row('Total JS chunks', reportA.chunkCount, reportB.chunkCount, (n) => String(n));
row('Entry chunk size', reportA.entrySize, reportB.entrySize);
row('Static import count', reportA.staticImportCount, reportB.staticImportCount, (n) => String(n));
row('Critical path raw', reportA.critRaw, reportB.critRaw);
row('Critical path gzipped', reportA.critGz, reportB.critGz);
row('Critical path brotli', reportA.critBr, reportB.critBr);
row('Total JS raw', reportA.totalRaw, reportB.totalRaw);
row('Total JS gzipped', reportA.totalGz, reportB.totalGz);

console.log('\n--- Entry chunk static imports ---');
const inB = new Set(reportB.staticImports);
const inA = new Set(reportA.staticImports);
const onlyA = reportA.staticImports.filter(x => !inB.has(x));
const onlyB = reportB.staticImports.filter(x => !inA.has(x));
console.log(`Only in ${reportA.label}: ${onlyA.length}`);
for (const x of onlyA) console.log(`  - ${x}`);
console.log(`Only in ${reportB.label}: ${onlyB.length}`);
for (const x of onlyB) console.log(`  + ${x}`);

const riskLabel = {
  safe: 'safe (in entry chunk body — runs after main.tsx imports complete)',
  danger: 'DANGER (statically imported by entry — runs before entry body, before ./i18n.init())',
  lazy: 'lazy (loaded on demand — generally safe)',
  missing: '(marker not found in any chunk)',
};

for (const m of args.markers) {
  console.log(`\n--- Marker '${m}' ---`);
  const dump = (report) => {
    const matches = report.markers.filter(x => x.name === m && x.chunk);
    if (!matches.length) return '(not found)';
    return matches
      .map(l => `${l.chunk} (offset ${l.position} of ${l.chunkSize}) — ${riskLabel[l.risk]}`)
      .join('\n      ');
  };
  console.log(`  ${reportA.label}:\n      ${dump(reportA)}`);
  console.log(`  ${reportB.label}:\n      ${dump(reportB)}`);
}

console.log('\n========== END ==========\n');
console.log(`Artifacts kept at:\n  ${dirA}\n  ${dirB}`);
console.log(`Restored working tree to: ${originalRef} (${originalSha.slice(0, 8)})`);
