#!/usr/bin/env node
// Scan every .ts/.tsx file in the repo for module-scope calls matching the
// rules in `anti-patterns.config.mjs`. A "module-scope call" is a CallExpression
// whose ancestor chain contains no function/arrow/method — i.e. one that
// executes at module load.
//
// Such calls are dangerous in modules that may be evaluated before the entry
// chunk's initializers (e.g. before `i18next.init()`) — see SKILL.md for the
// full mental model.
//
// Usage:
//   node find-toplevel-init-calls.mjs                 # scan workspace root
//   node find-toplevel-init-calls.mjs <dir>           # scan a subtree
//   node find-toplevel-init-calls.mjs --json          # machine-readable
//                                                       output for snapshot.mjs
//
// Exit code:
//   0 — always (this is a report, not a gate). Use --json + jq to gate.

import { readFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findWorkspaceRoot(start) {
  let dir = start;
  for (let i = 0; i < 20; i++) {
    try {
      const pkg = readFileSync(`${dir}/package.json`, 'utf8');
      if (/"name":\s*"openops"/.test(pkg) || /"workspaces"/.test(pkg)) return dir;
    } catch {}
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const dirArg = args.find((a) => !a.startsWith('--'));
const cwd = dirArg ? resolve(dirArg) : findWorkspaceRoot(process.cwd());

const require = createRequire(`${cwd}/package.json`);
let ts;
try {
  ts = require('typescript');
} catch {
  console.error(`Could not load typescript from ${cwd}/node_modules.`);
  console.error('Install dependencies first, or run from inside the repo.');
  process.exit(1);
}

const config = (await import(`${__dirname}/anti-patterns.config.mjs`)).default;
if (!Array.isArray(config) || config.length === 0) {
  console.error('anti-patterns.config.mjs must default-export a non-empty array.');
  process.exit(1);
}

// Validate rules.
for (const r of config) {
  if (!r.name || !r.module || !r.binding || !r.importKind) {
    console.error(`Invalid rule: ${JSON.stringify(r)}`);
    process.exit(1);
  }
  if (!r.matchCall && !(Array.isArray(r.matchMethodCall) && r.matchMethodCall.length)) {
    console.error(`Rule '${r.name}' must set matchCall or matchMethodCall.`);
    process.exit(1);
  }
}

const isFunctionLike = (n) =>
  ts.isFunctionDeclaration(n) ||
  ts.isFunctionExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) ||
  ts.isConstructorDeclaration(n) ||
  ts.isGetAccessorDeclaration(n) ||
  ts.isSetAccessorDeclaration(n);

const isModuleScope = (callNode) => {
  let p = callNode.parent;
  while (p) {
    if (isFunctionLike(p)) return false;
    p = p.parent;
  }
  return true;
};

// Build per-rule regexes that detect whether a file's imports match.
function fileMatchesRule(src, rule) {
  const mod = rule.module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (rule.importKind === 'named') {
    const re = new RegExp(
      `import\\s*\\{[^}]*\\b${rule.binding}\\b[^}]*\\}\\s*from\\s*['"]${mod}['"]`,
    );
    return re.test(src);
  }
  if (rule.importKind === 'default') {
    const re = new RegExp(
      `import\\s+${rule.binding}\\s*(?:,\\s*\\{[^}]*\\})?\\s*from\\s*['"]${mod}['"]`,
    );
    return re.test(src);
  }
  return false;
}

// Collect candidates: any file that imports any rule's module. Use multiple
// `-e` fixed-string patterns to stay quote-agnostic (both `from '...'` and
// `from "..."` forms are accepted) without touching shell quoting.
let candidates;
{
  const modules = [...new Set(config.map((r) => r.module))];
  const grepArgs = ['grep', '-lF'];
  for (const m of modules) {
    grepArgs.push('-e', `from '${m}'`);
    grepArgs.push('-e', `from "${m}"`);
  }
  grepArgs.push('--', '*.ts', '*.tsx');
  const res = spawnSync('git', grepArgs, { cwd, encoding: 'utf8' });
  // git grep exits 1 when nothing matches; that's fine — only treat other
  // non-zero exit codes as an error.
  if (res.status !== 0 && res.status !== 1) {
    console.error(`git grep failed (exit ${res.status}): ${res.stderr}`);
    process.exit(1);
  }
  candidates = (res.stdout || '').split('\n').filter(Boolean);
}

const offenders = []; // { rule, file, hits: [line] }
const countsByRule = Object.fromEntries(config.map((r) => [r.name, 0]));

for (const relFile of candidates) {
  const file = `${cwd}/${relFile}`;
  const src = readFileSync(file, 'utf8');

  const matchingRules = config.filter((r) => fileMatchesRule(src, r));
  if (matchingRules.length === 0) continue;

  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    relFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const hitsByRule = new Map();

  const walk = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      for (const rule of matchingRules) {
        let matched = false;
        if (rule.matchCall && ts.isIdentifier(callee) && callee.text === rule.binding) {
          matched = true;
        } else if (
          rule.matchMethodCall &&
          ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          callee.expression.text === rule.binding &&
          rule.matchMethodCall.includes(callee.name.text)
        ) {
          matched = true;
        }
        if (matched && isModuleScope(node)) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          if (!hitsByRule.has(rule.name)) hitsByRule.set(rule.name, new Set());
          hitsByRule.get(rule.name).add(line + 1);
        }
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(sf);

  for (const [ruleName, lineSet] of hitsByRule) {
    const hits = [...lineSet].sort((a, b) => a - b);
    offenders.push({ rule: ruleName, file: relFile, hits });
    countsByRule[ruleName] += hits.length;
  }
}

if (jsonMode) {
  process.stdout.write(
    JSON.stringify({ countsByRule, offenders }, null, 2) + '\n',
  );
  process.exit(0);
}

if (offenders.length === 0) {
  console.error('No module-scope init-call offenders found.');
  process.exit(0);
}

// Group by rule for readability.
const byRule = new Map();
for (const o of offenders) {
  if (!byRule.has(o.rule)) byRule.set(o.rule, []);
  byRule.get(o.rule).push(o);
}

for (const [rule, items] of byRule) {
  console.log(`\n=== rule: ${rule} (${items.length} file(s), ${countsByRule[rule]} call(s)) ===`);
  for (const { file, hits } of items) {
    console.log(`${file}: lines ${hits.join(', ')}`);
  }
}

console.error(
  `\nFound ${offenders.length} file(s) with module-scope init-call hits. ` +
    `Each is a latent build-timing regression. Fix by moving the call inside a ` +
    `component (useTranslation() etc.) or a factory function.`,
);
