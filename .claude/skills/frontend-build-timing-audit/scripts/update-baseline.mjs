#!/usr/bin/env node
// Capture a fresh snapshot of the current build and write it to
// `baseline.json`. Prints the diff against the previous baseline before
// writing so changes are visible.
//
// Usage:
//   node update-baseline.mjs                      # build + write
//   node update-baseline.mjs --no-build           # reuse dist/
//   node update-baseline.mjs --marker 'View ...'  # repeatable; preserved
//                                                   in baseline.markers
//
// Thresholds are preserved across updates. If `baseline.json` does not yet
// exist, sensible defaults are used (3% warn / 7% fail for size metrics,
// 0% warn / 50% fail for anti-pattern counts).

import { spawnSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = resolve(__dirname, '..');
const BASELINE_PATH = `${SKILL_DIR}/baseline.json`;

function parseArgs(argv) {
  const out = { build: true, markers: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-build') out.build = false;
    else if (a === '--marker') out.markers.push(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log('See header of update-baseline.mjs for usage.');
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv);

let previous = null;
if (existsSync(BASELINE_PATH)) {
  try {
    previous = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch (e) {
    console.error(`Could not parse existing ${BASELINE_PATH}: ${e.message}`);
    process.exit(2);
  }
}

// Determine marker list: command-line args win; otherwise reuse previous.
const markers =
  args.markers.length > 0
    ? args.markers
    : (previous?.metrics.markers || []).map((m) => m.name);

const cwd = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const buildDir = `${cwd}/dist/packages/react-ui`;

const snapshotArgs = ['--build-dir', buildDir];
if (!args.build) snapshotArgs.push('--no-build');
for (const m of markers) snapshotArgs.push('--marker', m);

console.error('Capturing snapshot...');
const res = spawnSync('node', [`${__dirname}/snapshot.mjs`, ...snapshotArgs], {
  encoding: 'utf8',
});
if (res.status !== 0) {
  console.error('snapshot failed:');
  console.error(res.stdout);
  console.error(res.stderr);
  process.exit(2);
}
const fresh = JSON.parse(res.stdout);

// Preserve or initialise thresholds.
const defaultThresholds = {
  chunkCount: { warnPct: 5, failPct: 15 },
  entryChunkSize: { warnPct: 5, failPct: 15 },
  criticalPathRaw: { warnPct: 3, failPct: 7 },
  criticalPathGzipped: { warnPct: 3, failPct: 7 },
  criticalPathBrotli: { warnPct: 3, failPct: 7 },
  totalJsRaw: { warnPct: 3, failPct: 7 },
  totalJsGzipped: { warnPct: 3, failPct: 7 },
  staticImportCount: { warnPct: 0, failPct: 50 },
};
const antiPatternDefaults = Object.fromEntries(
  Object.keys(fresh.metrics.antiPatternCounts || {}).map((rule) => [
    `antiPatternCounts.${rule}`,
    { warnPct: 0, failPct: 50 },
  ]),
);

const thresholds = {
  ...defaultThresholds,
  ...antiPatternDefaults,
  ...(previous?.thresholds || {}),
};

const baseline = {
  version: 1,
  capturedAt: fresh.capturedAt,
  capturedFromSha: fresh.capturedFromSha,
  thresholds,
  metrics: fresh.metrics,
};

// Print diff against previous if present.
if (previous) {
  console.error('\nDiff vs previous baseline:');
  const keys = [
    'chunkCount',
    'entryChunkSize',
    'criticalPathRaw',
    'criticalPathGzipped',
    'criticalPathBrotli',
    'totalJsRaw',
    'totalJsGzipped',
    'staticImportCount',
  ];
  for (const k of keys) {
    const before = previous.metrics[k];
    const after = fresh.metrics[k];
    if (before === undefined) continue;
    let deltaStr;
    if (!before) {
      deltaStr = after === 0 ? '+0.00%' : 'new';
    } else {
      const delta = (100 * (after - before)) / before;
      deltaStr = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`;
    }
    console.error(
      `  ${k.padEnd(24)} ${String(before).padStart(12)} → ${String(after).padStart(12)}  (${deltaStr})`,
    );
  }
  const ruleNames = new Set([
    ...Object.keys(previous.metrics.antiPatternCounts || {}),
    ...Object.keys(fresh.metrics.antiPatternCounts || {}),
  ]);
  for (const rule of ruleNames) {
    const before = (previous.metrics.antiPatternCounts || {})[rule] ?? 0;
    const after = (fresh.metrics.antiPatternCounts || {})[rule] ?? 0;
    if (before === after) continue;
    console.error(`  antiPatternCounts.${rule}: ${before} → ${after}`);
  }
}

writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
console.error(`\nWrote ${BASELINE_PATH}`);
console.error(`capturedFromSha: ${baseline.capturedFromSha}`);
