#!/usr/bin/env node
// Compare a fresh snapshot of the current build against the committed
// `baseline.json`. Prints a diff table identical in shape to `bundle-diff.mjs`
// and exits with a coded status.
//
// Exit codes:
//   0  every gated metric is within `warnPct`
//   1  at least one metric exceeded its `warnPct` but stayed below `failPct`
//   2  at least one metric exceeded its `failPct` (CI gate)
//
// Usage:
//   node check-regression.mjs                          # build + compare
//   node check-regression.mjs --no-build               # reuse dist/
//   node check-regression.mjs --baseline path.json
//   node check-regression.mjs --json                   # machine-readable
//
// Thresholds are read from baseline.json:
//   thresholds: {
//     <metricName>: { warnPct, failPct }
//   }
// where `metricName` is either a top-level metric (criticalPathGzipped,
// totalJsGzipped, etc.) or `antiPatternCounts.<ruleName>`.

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = resolve(__dirname, '..');

function parseArgs(argv) {
  const out = { build: true, baseline: `${SKILL_DIR}/baseline.json`, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-build') out.build = false;
    else if (a === '--baseline') out.baseline = argv[++i];
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') {
      console.log('See header of check-regression.mjs for usage.');
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv);

let baseline;
try {
  baseline = JSON.parse(readFileSync(args.baseline, 'utf8'));
} catch (e) {
  console.error(`Could not read baseline from ${args.baseline}: ${e.message}`);
  console.error('Run update-baseline.mjs first.');
  process.exit(2);
}

// Re-use marker names from baseline so the comparison is apples-to-apples.
const markerArgs = (baseline.metrics.markers || [])
  .map((m) => ['--marker', m.name])
  .flat();

const snapshotArgs = ['--build-dir', `${execSync(
  'git rev-parse --show-toplevel',
  { encoding: 'utf8' },
).trim()}/dist/packages/react-ui`];
if (!args.build) snapshotArgs.push('--no-build');

const res = spawnSync(
  'node',
  [`${__dirname}/snapshot.mjs`, ...snapshotArgs, ...markerArgs],
  { encoding: 'utf8' },
);
if (res.status !== 0) {
  console.error('snapshot failed:');
  console.error(res.stdout);
  console.error(res.stderr);
  process.exit(2);
}
const current = JSON.parse(res.stdout);

// ---------- Compare ----------
const thresholds = baseline.thresholds || {};

function pctDelta(baseVal, curVal) {
  if (!baseVal) return curVal === 0 ? 0 : Infinity;
  return (100 * (curVal - baseVal)) / baseVal;
}

function classify(name, baseVal, curVal) {
  const t = thresholds[name];
  const delta = pctDelta(baseVal, curVal);
  if (!t) return { status: 'ok', delta };
  // Improvements (delta <= 0) are always 'ok'; only regressions trigger
  // warn/fail. `warnPct: 0` means "any positive change warns".
  if (delta <= 0) return { status: 'ok', delta, threshold: t };
  if (delta >= t.failPct) return { status: 'fail', delta, threshold: t };
  if (delta > t.warnPct || (t.warnPct === 0 && delta > 0))
    return { status: 'warn', delta, threshold: t };
  return { status: 'ok', delta, threshold: t };
}

const gated = [
  ['chunkCount', baseline.metrics.chunkCount, current.metrics.chunkCount],
  ['entryChunkSize', baseline.metrics.entryChunkSize, current.metrics.entryChunkSize],
  ['criticalPathRaw', baseline.metrics.criticalPathRaw, current.metrics.criticalPathRaw],
  ['criticalPathGzipped', baseline.metrics.criticalPathGzipped, current.metrics.criticalPathGzipped],
  ['criticalPathBrotli', baseline.metrics.criticalPathBrotli, current.metrics.criticalPathBrotli],
  ['totalJsRaw', baseline.metrics.totalJsRaw, current.metrics.totalJsRaw],
  ['totalJsGzipped', baseline.metrics.totalJsGzipped, current.metrics.totalJsGzipped],
  ['staticImportCount', baseline.metrics.staticImportCount, current.metrics.staticImportCount],
];

const ruleNames = new Set([
  ...Object.keys(baseline.metrics.antiPatternCounts || {}),
  ...Object.keys(current.metrics.antiPatternCounts || {}),
]);
const antiPatternRows = [...ruleNames].map((rule) => [
  `antiPatternCounts.${rule}`,
  (baseline.metrics.antiPatternCounts || {})[rule] ?? 0,
  (current.metrics.antiPatternCounts || {})[rule] ?? 0,
]);

const allRows = [...gated, ...antiPatternRows].map(([name, b, c]) => ({
  name,
  baseline: b,
  current: c,
  ...classify(name, b, c),
}));

let worst = 'ok';
for (const r of allRows) {
  if (r.status === 'fail') worst = 'fail';
  else if (r.status === 'warn' && worst !== 'fail') worst = 'warn';
}

if (args.json) {
  process.stdout.write(
    JSON.stringify(
      {
        baseline: { sha: baseline.capturedFromSha, capturedAt: baseline.capturedAt },
        current: { sha: current.capturedFromSha, capturedAt: current.capturedAt },
        rows: allRows,
        verdict: worst,
      },
      null,
      2,
    ) + '\n',
  );
} else {
  // Pretty-print.
  const fmt = (name, n) =>
    name === 'chunkCount' ||
    name === 'staticImportCount' ||
    name.startsWith('antiPatternCounts.')
      ? String(n)
      : (n / 1024).toFixed(1) + ' KB';

  console.log('\n========== REGRESSION CHECK ==========');
  console.log(
    `baseline: ${baseline.capturedFromSha}  (captured ${baseline.capturedAt})`,
  );
  console.log(
    `current : ${current.capturedFromSha}  (captured ${current.capturedAt})\n`,
  );

  const head = `${'Metric'.padEnd(36)}  ${'baseline'.padStart(14)}  ${'current'.padStart(14)}  ${'Δ%'.padStart(8)}  status`;
  console.log(head);
  console.log('-'.repeat(head.length));
  for (const r of allRows) {
    const tag =
      r.status === 'fail' ? 'FAIL' : r.status === 'warn' ? 'warn' : 'ok';
    const deltaStr = isFinite(r.delta)
      ? `${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(1)}%`
      : 'new';
    console.log(
      `${r.name.padEnd(36)}  ${fmt(r.name, r.baseline).padStart(14)}  ${fmt(r.name, r.current).padStart(14)}  ${deltaStr.padStart(8)}  ${tag}`,
    );
  }
  console.log('');
  console.log(`Verdict: ${worst.toUpperCase()}`);
  if (worst !== 'ok') {
    console.log(
      'Tip: run bundle-diff.mjs against main to investigate which chunks moved.',
    );
  }
}

process.exit(worst === 'fail' ? 2 : worst === 'warn' ? 1 : 0);
