#!/usr/bin/env node
// Snapshot the current production build's bundle metrics + AST anti-pattern
// counts into a JSON document. Used by:
//   - `update-baseline.mjs` to write `baseline.json`
//   - `check-regression.mjs` to compare against the committed baseline
//
// Usage:
//   node snapshot.mjs                                # builds, prints JSON
//   node snapshot.mjs --no-build                     # reuse existing dist/
//   node snapshot.mjs --out /tmp/snap.json           # write to file
//   node snapshot.mjs --marker 'View input data' ... # repeatable
//   node snapshot.mjs --build-dir dist/packages/react-ui
//
// Output shape:
//   {
//     version: 1,
//     capturedAt: ISO timestamp,
//     capturedFromSha: short SHA or 'dirty',
//     metrics: { chunkCount, entryChunkSize, criticalPathRaw,
//                criticalPathGzipped, criticalPathBrotli,
//                totalJsRaw, totalJsGzipped, staticImportCount,
//                antiPatternCounts: { <ruleName>: <count> },
//                markers: [{ name, chunk, risk }] }
//   }

import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeBuild } from './lib/analyze.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs(argv) {
  const out = { markers: [], build: true, out: null, buildDir: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--no-build') out.build = false;
    else if (a === '--marker') out.markers.push(next());
    else if (a === '--out') out.out = next();
    else if (a === '--build-dir') out.buildDir = next();
    else if (a === '--help' || a === '-h') {
      console.log('See header of snapshot.mjs for usage.');
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv);

const cwd = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
process.chdir(cwd);

const buildDir = args.buildDir || `${cwd}/dist/packages/react-ui`;

if (args.build) {
  console.error('Building react-ui (this may take ~30s)...');
  // Route build output to stderr so it cannot pollute our JSON stdout.
  execSync(`npx nx build react-ui --skip-nx-cache 2>&1 | tail -3 1>&2`, {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: '/bin/bash',
  });
}

const build = analyzeBuild(buildDir, args.markers);

// Run the AST scanner in JSON mode to get per-rule counts.
const scanner = `${__dirname}/find-toplevel-init-calls.mjs`;
const scan = spawnSync('node', [scanner, '--json'], {
  cwd,
  encoding: 'utf8',
});
if (scan.status !== 0) {
  console.error('Scanner failed:');
  console.error(scan.stdout);
  console.error(scan.stderr);
  process.exit(scan.status || 1);
}

let antiPatternCounts;
try {
  antiPatternCounts = JSON.parse(scan.stdout).countsByRule;
} catch (e) {
  console.error('Could not parse scanner output as JSON:');
  console.error(scan.stdout);
  throw e;
}

let sha;
try {
  // Ignore untracked files when judging "dirty" — those don't affect the
  // build output, only tracked modifications do.
  const dirty = execSync('git status --porcelain --untracked-files=no', {
    encoding: 'utf8',
  }).trim();
  const rev = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  sha = dirty ? `${rev}-dirty` : rev;
} catch {
  sha = 'unknown';
}

const snapshot = {
  version: 1,
  capturedAt: new Date().toISOString(),
  capturedFromSha: sha,
  metrics: {
    chunkCount: build.chunkCount,
    entryChunkSize: build.entrySize,
    criticalPathRaw: build.critRaw,
    criticalPathGzipped: build.critGz,
    criticalPathBrotli: build.critBr,
    totalJsRaw: build.totalRaw,
    totalJsGzipped: build.totalGz,
    staticImportCount: build.staticImportCount,
    antiPatternCounts,
    markers: build.markers.map((m) => ({
      name: m.name,
      chunk: m.chunk,
      risk: m.risk,
    })),
  },
};

const json = JSON.stringify(snapshot, null, 2);
if (args.out) {
  const target = resolve(args.out);
  writeFileSync(target, json + '\n');
  console.error(`Wrote ${target}`);
} else {
  process.stdout.write(json + '\n');
}
