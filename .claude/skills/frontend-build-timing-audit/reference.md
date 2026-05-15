# Reference: chunk-evaluation timing bugs in react-ui builds

Long-form companion to `SKILL.md`. Read on demand when triaging a build-mode
regression that resembles OPS-4318.

## The OPS-4318 timeline (worked example)

**Symptom:** the `<TestStepDataViewer>` toggle showed two blank buttons
instead of "Input" / "Output" labels. Visible in docker compose, prod, and
staging. Not reproducible in `nx serve react-ui` (dev mode).

**Root cause:** the module had `import { t } from 'i18next'` and:

```tsx
const VIEW_INPUT_OPTIONS = [
  { value: 'Input', label: t('Input'), tooltipText: t('View input data') },
  { value: 'Output', label: t('Output'), tooltipText: t('View output data') },
];
```

at module top level. In the production build, rolldown placed this file in a
static-dependency chunk that ran before `./i18n.ts`'s `init()` call.

## Why `t()` returns `undefined` before init

From `node_modules/i18next/dist/cjs/i18next.js` line 2215:

```js
t() {
  return this.translator && this.translator.translate(...arguments);
}
```

The `translator` property is assigned inside `init()` at line 1987. Until
`init()` runs, `this.translator` is `undefined`, so `t()` short-circuits and
returns `undefined`. React renders `undefined` as nothing — hence blank
labels.

This is different from "returns the key as fallback" (which is what i18next
does AFTER init when no translation matches). Pre-init, the function returns
literally nothing.

## Why dev mode hides the bug

`packages/react-ui/src/main.tsx`:

```tsx
import '@openops/components/ui/tailwind.css';
import './i18n';
import App from './app/app';
```

In dev, Vite serves each ES module via separate HTTP requests. The browser
walks the dependency graph dynamically, and `./i18n` is always discovered and
evaluated before any module that App imports.

In production, all source modules are bundled into a small number of chunks
that are loaded as `<script type="module">` (entry) plus static `import { ... }
from "./chunk.js"` (dependencies). ESM semantics require all dependency module
bodies to evaluate before the importing module body — so a dependency chunk
runs before the entry chunk body, even though the entry chunk's source has
`import './i18n'` as its first statement.

## The 4-way controlled experiment (OPS-4318 / OPS-4320)

To isolate which fix actually solves the bug, we ran four production builds:

| Build | `sideEffects` on ui-components | Hook fix on test-step-data-viewer | Behavior   |
| ----- | ------------------------------ | --------------------------------- | ---------- |
| A     | array form                     | yes                               | works      |
| B     | none                           | yes                               | works      |
| C     | array form                     | no                                | works      |
| D     | none                           | no                                | **broken** |

Bundle stats:

| Build | # chunks | Entry size | `test-step-data-viewer` lives in                         |
| ----- | -------- | ---------- | -------------------------------------------------------- |
| A     | 117      | 2,941 KB   | entry chunk                                              |
| B     | 120      | 1,736 KB   | separate `cloud-user-api-*.js` (1,330 KB), static import |
| C     | 117      | 2,938 KB   | entry chunk                                              |
| D     | 120      | 1,736 KB   | separate `cloud-user-api-*.js` (1,326 KB), static import |

Critical-path bytes (entry chunk + every chunk it statically imports):

| Build | Raw      | gzipped  | brotli |
| ----- | -------- | -------- | ------ |
| A     | 4,124 KB | 1,199 KB | 953 KB |
| B     | 4,203 KB | 1,223 KB | 980 KB |
| D     | 4,201 KB | 1,222 KB | 980 KB |

Total JS shipped:

| Build | Raw      | gzipped  |
| ----- | -------- | -------- |
| A     | 7,073 KB | 2,035 KB |
| B     | 7,196 KB | 2,074 KB |
| D     | 7,194 KB | 2,073 KB |

**Surprising conclusion:** Declaring `sideEffects` causes rolldown to inline
modules into the entry chunk (the entry grows from 1.7 MB to 2.9 MB), but the
total critical path shrinks because rolldown can tree-shake unused barrel
re-exports once it knows they're pure. The combined bytes go down ~80 KB raw
and ~24 KB gzipped.

The fix is also a slight perf win, not a regression.

## Why `sideEffects` changes the chunk graph

When a package's `package.json` lacks `sideEffects`, rolldown assumes every
module in that package may have observable side effects (CSS injection,
global registration, polyfill assignment, etc.). To preserve those side
effects, rolldown is conservative about merging modules: it tends to split
them into dependency chunks that are statically imported by their consumers.
Static imports preserve evaluation order, so the side effects fire.

When `sideEffects: false` (or an allowlist array) is declared, rolldown knows
the JS modules are pure (except for the listed patterns). It can then:

1. Tree-shake unused exports from barrels.
2. Drop modules entirely from chunks that don't use any of their exports.
3. **Inline modules into the entry chunk body** rather than emit them as
   separate static-dep chunks.

It's (3) that fixes OPS-4318. Once inlined, the module body executes within
the entry chunk's own evaluation order — which follows `main.tsx`'s source
declaration order, so `./i18n` is guaranteed to run before any App-tree code.

## The "sideEffects" array form vs `false`

For `packages/ui-components`, the right declaration is:

```json
{
  "sideEffects": ["*.css", "*.scss"]
}
```

We verified the package contains exactly three side-effectful imports, all
CSS:

- `packages/ui-components/src/tailwind.css` (re-exported via barrel)
- `packages/ui-components/src/styles/global.css`
- `import '@xyflow/react/dist/style.css'` inside
  `packages/ui-components/src/components/flow-canvas/flow-canvas.tsx`

Plain `"sideEffects": false` would silently drop the xyflow CSS import,
breaking the flow canvas styling. The array form lets rolldown tree-shake JS
modules while preserving CSS side effects.

## Related upstream changes that exposed the bug

The OPS-4318 regression was triggered by two dependency updates landing
around the same time:

- `i18next-http-backend` 2.5.2 → 3.0.5 (PR #2246). v3.0.0 switched to pure
  ESM (`"type": "module"`, separate `esm/`/`cjs/` outputs, exports map). The
  release notes explicitly mention top-level-await concerns: _"for esm build
  environments not supporting top-level await, you should import the
  `i18next-http-backend/cjs` export or stay at v2.6.2/v2.7.1"_.
- Vite 8.0.8 (workspace upgrade for Storybook 10 compatibility, PR #2271).
  Vite 8 uses rolldown as the bundler; rolldown's chunk-splitting heuristics
  differ from classic Rollup, particularly for packages without explicit
  `sideEffects` declarations.

Neither change is "wrong" in isolation; together they shifted module
evaluation timing enough to expose a latent module-scope `t()` call that had
been ridden the lucky chunk-ordering side of the race since June 2025.

## Investigation method (replicable)

To reproduce or run a similar investigation on a new regression:

1. Identify a literal that you expect to be missing/broken in the production
   UI (e.g. `'View input data'`). This is your "marker".
2. From a clean working tree, run:
   ```bash
   node .claude/skills/frontend-build-timing-audit/scripts/find-toplevel-init-calls.mjs
   ```
   This flags candidates with module-scope `t()` calls.
3. If a candidate matches the broken module, you have a probable cause.
4. Verify with a 4-way (or 2-way) bundle diff:
   ```bash
   node .claude/skills/frontend-build-timing-audit/scripts/bundle-diff.mjs \
     --label-a 'before fix' --ref-a HEAD~1 \
     --label-b 'after fix'  --ref-b HEAD \
     --marker 'View input data'
   ```
5. Read the "Marker" section in the output. If `before fix` shows the marker
   in a chunk listed under "DANGER (statically imported by entry…)", the
   timing race is confirmed.
6. Pick a remediation:
   - **Source-level (preferred):** replace module-scope `t()` with
     `useTranslation()` inside the component / consumer. Local, surgical, no
     bundler dependency.
   - **Bundler-level (defense in depth):** declare `sideEffects` on the
     package containing the offender. Eliminates the race for every module in
     the package — but depends on rolldown heuristics that may shift in
     future upgrades.

The two layers compose; using both is recommended.

## Common offenders to watch for

Patterns that very often cause this problem (caught by the AST scanner):

- `const FOO_FILTER = { title: t('Status'), ... }` at module top level
- `const RUN_TYPES = { [Enum.X]: { text: t('...') } }` lookup tables
- `const VALIDATION_MESSAGES = { required: t('Required'), ... }` schemas
- Zod schemas with `.message(t('...'))`
- `react-router` route metadata `{ path: '/x', title: t('X') }`

The fix shape is the same for all of them — convert to a hook or factory
function. See `SKILL.md` for examples.

## Tracking over time

The skill ships a committed `baseline.json` that captures the build's
critical-path / chunk-count / anti-pattern footprint at a known-good commit.
Two scripts work against it:

- `scripts/check-regression.mjs` — builds `react-ui`, snapshots the current
  state, compares against `baseline.json`, and exits `0` / `1` / `2`
  (ok / warn / fail) based on the percent thresholds embedded in the
  baseline.
- `scripts/update-baseline.mjs` — re-anchors `baseline.json` after a
  deliberate change (e.g. a Vite upgrade, an intentional `sideEffects` flip,
  a barrel re-org). Prints the diff against the previous baseline before
  writing so the delta is visible in code review.

Anti-pattern counts (from the AST scanner) ride alongside size metrics in
the baseline. The default `warnPct: 0 / failPct: 50` on
`antiPatternCounts.i18next-t-call` means any _new_ module-scope `t(...)`
warns immediately even if the bundle metrics happen to fall within tolerance.

The plan is intentionally narrow: one committed baseline, manual updates,
no CI wiring. If the baseline drifts because of routine churn, edit the
thresholds inline in `baseline.json` or run `update-baseline.mjs`. See the
skill workflows section for the full agent loop.
