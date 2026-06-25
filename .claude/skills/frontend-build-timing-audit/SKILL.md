---
name: frontend-build-timing-audit
description: >
  Detects and diagnoses chunk-evaluation timing bugs in the Vite/rolldown
  production build of react-ui (works-in-dev / broken-in-build i18n
  regressions, missing UI labels, module-scope `t()` anti-patterns). Use when
  editing react-ui, ui-components, shared, vite.config.ts, package.json
  `sideEffects`, or i18n setup; or when a user reports blank labels in
  build/docker/staging/prod.
---

# Frontend Build Timing Audit

The OpenOps frontend has hit production-only i18n regressions caused by a subtle
interaction between Vite 8 + rolldown's chunk splitting and i18next's lazy
initialization. This skill bundles the tooling we used to diagnose and prevent
those bugs.

## When to use

Trigger this skill proactively when modifying any of:

- `packages/react-ui/**` (especially `main.tsx`, `i18n.ts`, routing/lazy loading)
- `packages/ui-components/**` (barrel exports in `src/index.ts`,
  `src/components/index.ts`)
- `packages/shared/**` (the `@openops/shared` barrel)
- `packages/react-ui/vite.config.ts`
- Any `package.json` with a `sideEffects` field
- Adding or removing top-level `import { t } from 'i18next'` calls

Or reactively when a user reports:

- "Works in dev, broken in production / docker compose / staging"
- "i18n labels are missing / blank / undefined"
- "Toggle / button / nav item has no text"
- Empty strings appearing in the UI after deployment

## The bug pattern (mental model)

```text
main.tsx imports:
  1) ./i18n.ts    ← calls i18next.init() which sets this.translator
  2) ./app/app    ← the rest of the App
```

In dev, `./i18n.ts` always evaluates before any App module, so a top-level
`t('Foo')` inside an App-tree module gets a working `translator`.

In production builds, rolldown can split the App tree into static-dependency
chunks of the entry chunk (`import {...} from "./cloud-user-api-*.js"`). Per
the ESM spec, those dependency chunks' module bodies evaluate **before** the
entry chunk body — which means before `./i18n.ts`'s `init()` call. Any
module-scope `t('...')` in those chunks now runs while `i18next.translator` is
undefined, and `t()` returns `undefined`. The "label" gets frozen as
`undefined` in a top-level array/object and the UI renders nothing.

**The fix has two layers:**

1. **Source layer:** never call `t()` at module top level. Use
   `useTranslation()` (a hook) or a factory function instead. This is what PR
   [#2292](https://github.com/openops-cloud/openops/pull/2292) did for
   `test-step-data-viewer.tsx`.
2. **Bundler layer:** declare
   `"sideEffects": ["*.css", "*.scss"]` on `packages/ui-components/package.json`
   so rolldown stops emitting `ui-components` modules as static-dependency
   chunks and inlines them into the entry chunk body where `./i18n` always
   wins. This is PR
   [#2293](https://github.com/openops-cloud/openops/pull/2293).

For the full investigation with measurements, see [reference.md](reference.md).

## Workflows

### Workflow 1: Quick anti-pattern scan (always run when touching FE code)

The script `scripts/find-toplevel-init-calls.mjs` uses TypeScript's AST to
find every call to a configured init-dependent binding whose ancestor chain
contains no function/arrow/method — i.e. every module-scope invocation that
runs at module load.

The set of bindings to watch is declared in
`scripts/anti-patterns.config.mjs` (data-driven). The initial entry covers
the i18next `t` case that caused OPS-4318; adding a new pattern (Sentry,
dayjs locale, etc.) is a one-liner.

```bash
node .claude/skills/frontend-build-timing-audit/scripts/find-toplevel-init-calls.mjs
```

Output groups results by rule, one line per offender: `<path>: lines 12, 19,
25`. The scan runs in ~1 second across the whole repo. Pass `--json` to get
a machine-readable shape (used by `snapshot.mjs`).

**Triage rule:** every result is a latent OPS-4318-style regression. The risk
of it manifesting today depends on which chunk the file lands in, which
depends on rolldown's heuristics. Treat any hit as something to fix or
explicitly justify.

When you find offenders, fix them by:

- For React components: `const { t } = useTranslation()` inside the component,
  move the constant inside the function body or wrap it in `useMemo`.
- For non-component files (zod schemas, filter configs, route metadata): convert
  the exported constant into a factory function `getFooFilter(t)` or a hook
  `useFooFilter()`.

### Workflow 2: Bundle-diff diagnostic (when actively triaging a regression)

The script `scripts/bundle-diff.mjs` runs two production builds (varying
working-tree state), then compares:

- Chunk count and entry chunk size
- Which chunks contain a given marker string (e.g. a missing label literal)
- Static-import dependency list at the top of the entry chunk
- Critical-path size (raw / gzipped / brotli) — what the user actually
  downloads before the app can boot

This takes ~30s per build configuration. Use it when:

- The AST scan is clean but a build-only bug is still suspected (maybe from a
  vendor module, dependency upgrade, or vite config change).
- Evaluating whether a proposed `sideEffects` change actually helps.
- Comparing bundle behavior before/after a vite or rolldown upgrade.

Usage:

```bash
node .claude/skills/frontend-build-timing-audit/scripts/bundle-diff.mjs \
  --label-a 'baseline (main)' --ref-a main \
  --label-b 'feature branch'  --ref-b HEAD \
  --marker 'View input data'
```

`--marker` is the literal you expect to be missing or moved (e.g. a label
that disappeared). It will be located in each build's chunk graph so you can
see whether it's in the entry chunk (safe — runs after `i18n.init()`) or a
statically-imported sibling chunk (dangerous — runs before).

For multi-variable experiments (e.g. toggle two patches independently to
isolate which one fixes the bug), see the `--patch-a` / `--patch-b` flags
documented in the script's `--help`.

### Workflow 3: Regression check vs committed baseline

`scripts/baseline.json` captures the current build's chunk count, entry-chunk
size, critical-path size (raw / gzipped / brotli), total JS size, and per-rule
anti-pattern counts. Two scripts work against it:

```bash
# After editing FE code, verify nothing regressed past thresholds.
node .claude/skills/frontend-build-timing-audit/scripts/check-regression.mjs
# Exit codes: 0 ok, 1 warn, 2 fail (suitable as a CI gate).

# Re-anchor the baseline after an intentional change (dependency upgrade,
# refactor that legitimately moves chunks).
node .claude/skills/frontend-build-timing-audit/scripts/update-baseline.mjs
# Prints the diff vs the previous baseline before writing.
```

Thresholds live inside `baseline.json` as percent deltas so routine growth
doesn't constantly require updates. Anti-pattern counts default to `warnPct:
0` so any new offender (a new module-scope `t(...)`, a new
module-scope `Sentry.init(...)`, etc.) warns immediately.

Use this workflow:

- After landing FE changes locally to catch surprise bundle bloat.
- After a Vite, rolldown, or core dependency upgrade.
- Before approving a PR that touches barrels, lazy-loading boundaries, or
  `sideEffects` declarations.

If the verdict is `warn` or `fail`, drop into Workflow 2 (`bundle-diff.mjs`
against `main`) to see which chunks moved.

### Workflow 4: Pre-commit verification for `sideEffects` changes

If editing a `sideEffects` field in any `packages/*/package.json`:

1. Identify the package's real side effects (CSS/SCSS imports, global
   registrations, polyfills). Grep for `import '*.css'`, `customElements.define`,
   module-scope `window.*`/`global.*` assignments.
2. If only CSS/SCSS, use `"sideEffects": ["*.css", "*.scss"]` (array form).
3. Run `node .../scripts/bundle-diff.mjs` against the previous commit to
   confirm:
   - CSS files still in the build (xyflow, tailwind, app styles).
   - Critical-path size hasn't grown.
   - No expected runtime code was tree-shaken out.

## Key facts to remember

- **`t` imported from `i18next` is NOT reactive.** It does not re-render
  components when language changes or resources load. Use `useTranslation()`
  from `react-i18next` in components.
- **Before `i18next.init()` runs, `t()` returns `undefined`, not the key.**
  React renders `undefined` as nothing — that's why labels go blank rather than
  showing English fallback.
- **The repo's `translation.json` is key=key**, so once init has run, missing
  keys fall back to the English text by accident. This masks broken usage in
  most cases — but only after init. Module-scope `t()` may run before init.
- **`main.tsx` order matters.** `./i18n` MUST be imported before `App`.
  Verify with `head -10 packages/react-ui/src/main.tsx` when investigating.
- **Vite dev mode hides this bug entirely.** Always verify fixes against
  `npx nx build react-ui` output, not the dev server.

## Additional resources

- [reference.md](reference.md): full root-cause analysis with the measured
  4-way build comparison, byte-level chunk analysis, and the ESM evaluation
  semantics that make this bug possible.
- Related PRs: [#2292](https://github.com/openops-cloud/openops/pull/2292)
  (hook fix), [#2293](https://github.com/openops-cloud/openops/pull/2293)
  (`sideEffects` declaration).
- Related Linear: OPS-4318, OPS-4320.
