---
name: review-code
description: Review a GitHub pull request for the OpenOps codebase. Checks out the PR, analyzes changes through OpenOps-specific lenses, validates findings with confidence scoring, previews before posting, and supports inline comments.
when_to_use: "Reviewing a PR; '/review-code <number>'; 'review PR', 'check PR #N', 'code review'."
argument-hint: '[<pr-number>] [update]'
allowed-tools: [AskUserQuestion, Bash, Read, Glob, Grep, Write, Agent]
---

<!-- Tooling note: this `allowed-tools` list and the `--allowedTools` list in
.github/workflows/pr-reviewer.yml must stay in sync. The frontmatter governs
local `/review-code` runs; the workflow governs CI runs (which strips this
frontmatter before passing the body as the prompt). AskUserQuestion is local-only
(CI skips interaction). Write is needed by PR mode in both. This command uses NO
GitHub MCP tools — all GitHub I/O (fetching PR metadata/diff/comments and posting
the inline review, summary comment, and thread replies) goes through `gh`/`gh api`
over Bash, so it behaves identically in CI and locally with no MCP server. -->

# review-code

Review a pull request or local branch with confidence-scored findings and inline GitHub comments.

## Parse Arguments

- `$ARGUMENTS` contains a number → **PR mode** (that PR number)
- `$ARGUMENTS` is empty or contains no number → **LOCAL mode** (current branch vs `main`, terminal output only)
- `$ARGUMENTS` contains `update` → **UPDATE mode** (re-review unresolved threads on an existing PR)

---

## Phase 1: Setup

Resolve the repo identity — used for MCP calls and the upsert bash step. In CI `$GITHUB_REPOSITORY` is always set; fall back to parsing the remote for local use:

```bash
REPO=${GITHUB_REPOSITORY:-$(git remote get-url origin | sed -E 's|.*github\.com[:/]||;s|\.git$||')}
OWNER=$(echo $REPO | cut -d/ -f1)
REPO_NAME=$(echo $REPO | cut -d/ -f2)
```

### PR mode

```bash
gh pr checkout {PR_NUMBER}
```

If the working tree is unclean, stop and tell the user to stash or commit first.

### LOCAL mode

Determine the merge base against the freshly-fetched remote `main` (use
`origin/main` consistently — never local `main`, which may be stale):

```bash
git fetch origin main
MERGE_BASE=$(git merge-base origin/main HEAD)
```

---

## Phase 2: Gather Context

### PR mode

All context comes from `gh`/`git` — no MCP. Phase 1 already ran `gh pr checkout {PR_NUMBER}`, so `HEAD` is the PR head and the diff is available locally.

```bash
# Metadata (title, body, author, base branch, labels) — capture BASE_REF for the diff
BASE_REF=$(gh pr view {PR_NUMBER} --json baseRefName --jq '.baseRefName')
gh pr view {PR_NUMBER} --json title,body,author,baseRefName,headRefName,labels,isDraft

# Ensure the base is present locally, then diff against the merge base
git fetch origin "$BASE_REF"
git diff "origin/$BASE_REF...HEAD"            # full unified diff to analyze
git diff --numstat "origin/$BASE_REF...HEAD"  # changed files; sort desc by lines, skip "-\t-\t" (binary)

# Existing inline comments + reviews — to avoid re-raising covered points
gh api "repos/$OWNER/$REPO_NAME/pulls/{PR_NUMBER}/comments" --paginate
gh api "repos/$OWNER/$REPO_NAME/pulls/{PR_NUMBER}/reviews"  --paginate
```

Cross-reference the existing inline comments and reviews before the analysis phase to avoid re-raising points already covered by other reviewers.

### LOCAL mode

Reuse the `MERGE_BASE` resolved in Phase 1 (against `origin/main`):

```bash
git diff ${MERGE_BASE}..HEAD
git diff --numstat ${MERGE_BASE}..HEAD
```

No existing comment fetch needed.

### Both modes

- Read `AGENTS.md` at the repo root for project conventions
- Read the top 5 most-changed **source** files (up to 500 lines each) using the Read tool. When ranking by `--numstat`, **exclude** generated/vendored/lock files — they are churn, not logic, and would crowd out the files that matter. Skip: `*-lock.json`, `*.lock`, `package-lock.json`, `pnpm-lock.yaml`, anything under `dist/`, `build/`, `.nx/`, generated snapshots, and minified bundles. Still review lockfiles for the dependency-and-licensing lens (§12), but do not spend a "most-changed" slot reading them line by line.

### Large-diff handling

Before loading the full diff into context, check the size from `--numstat`:

- **> ~1500 changed lines or > 40 files:** do not pull the entire unified diff into one context. Analyze per-file (or per-package), reading each file's hunks from `git diff -- <path>` as you go, and prioritize files by the lenses they trigger (migrations, routes, engine/worker, shared types) over raw line count.
- If you must bound coverage, **say so explicitly** in the output (a `Coverage` note listing what was not deeply reviewed) — silent truncation reads as "I reviewed everything" when you did not.

---

## Phase 2b: Scope & Intent

Before applying any analysis lens, build a private map of the change:

- **What behavior is being added, removed, or changed?** Summarize in one sentence.
- **Which contracts are touched?** REST API shapes, TypeBox schemas, shared types, DB schema, block interfaces, worker/engine protocol.
- **Which downstream systems are affected?** Frontend, other blocks, CI, migrations, external integrations.
- **Is the implementation consistent with the PR description?** If the description says X but the diff does Y, that's a finding before any lens runs.

Use this map to focus the lens passes — only apply lenses relevant to what actually changed.

---

## Phase 3: Analyze

You are a Senior Software Engineer and Architect with deep production experience on this codebase. Your job is not to find something to criticize — it is to give the author the review you would want on your own PR: honest, specific, and focused on what actually matters. Confirm what is well-built. Escalate what is genuinely risky. Skip what is noise.

For each changed file, read the surrounding context — not just the diff lines. Think about:

- **System effects**: how does this change ripple beyond the files touched? Which Nx packages depend on the changed package?
- **Failure modes**: what is the worst-case runtime scenario? Does it corrupt workflow state, lose user data, or just show a bad error message?
- **Design intent**: is this the right solution to the right problem, or is it patching a symptom?
- **Production ownership**: would you be comfortable owning this in production with no other context?

Produce a list of **candidate issues** — each with: `file`, `line`, `category` (BLOCKER / RISK / NOTE / QUESTION), `problem`, `evidence`, `impact`, `fix`. **Do not score yet.**

- **BLOCKER**: merge this and you will likely cause a production incident. Data loss, security hole, guaranteed failure, workflow corruption, or outage.
- **RISK**: merge this knowingly — it is a deliberate decision with a real downside you must accept.
- **NOTE**: worth improving but not merge-blocking; the author's call.
- **QUESTION**: you cannot confirm or deny without author clarification — include it rather than dropping it.

Analyze through these lenses in priority order:

---

### 0. Design & architecture

Before examining individual lines, assess whether the approach itself is sound.

- Is this solving the right problem? If the PR description says X but the diff implements Y, that is a BLOCKER regardless of code quality.
- Is the abstraction level correct? This is an Nx monorepo with strict package boundaries (packages/shared for cross-cutting types, packages/server/shared for server utilities, packages/blocks/framework for block interfaces). A change that duplicates existing infrastructure or adds a new pattern without justification deserves a RISK or NOTE.
- Is the scope appropriate? A change that touches packages/shared or packages/server/shared affects both the App and Worker containers. A change in packages/blocks/framework affects all 50+ blocks. Flag blast radius.
- Is the complexity justified? A simpler solution that achieves the same result is almost always better. Flag accidental complexity.
- Will the next engineer understand this without asking the author?
- Does the change respect existing patterns? This codebase uses repoFactory for data access, ApplicationError with typed ErrorCode for errors, cacheWrapper for caching, and getProjectScopedRoutePolicy for auth. Introducing an alternative without justification is a finding.

---

### 1. Logic correctness

Read the implementation and verify it actually does what the PR description says. Flag:

- Implementation that diverges from the stated intent
- Off-by-one errors, inverted conditions, wrong operator (`&&` vs `||`)
- State transitions that can be skipped or entered twice
- Early returns or guard clauses that silently drop valid cases
- Async/await misuse: missing `await`, unhandled promise rejections, `Promise.all` where order matters
- TypeORM query builder mistakes: `.where()` overwriting previous conditions instead of `.andWhere()`, missing `.getMany()` vs .`getOne()` awareness

---

### 2. Workflow execution correctness

Changes to packages/engine/, packages/server/worker/, block run() functions, or flow-run-service.ts silently corrupt end-user workflows when broken. These paths run unattended and failures may not surface for hours. Apply the hardest scrutiny here.

- Does the engine correctly propagate errors up to the flow run record? A block that throws must result in FlowRunStatus.FAILED — never a silent swallow.
- Can a block's `run()` return without throwing and leave the workflow in an inconsistent state? Check that all code paths either return a valid StepOutput or throw an ApplicationError.
- Are retries idempotent? A block that mutates external state (AWS/Azure/GCP resources) and gets retried could double-charge, double-terminate, or double-send. Actions that mutate must set isWriteAction: true.
- Job polling: the worker uses a Semaphore-based lock in the job-polling module. Can a job be picked up by two workers simultaneously? Check that the API-side dequeue is atomic.
- In-flight state: inFlightRunStateCache in flow-run-service.ts uses Redis with a 1-hour TTL. A write that updates the database but not the cache (or vice versa) leaves stale state. Check both are updated together.
- ExecutionState transitions: verify the new code respects `isFlowStateTerminal()` — a run in a terminal status must not be resumed or re-queued.

---

### 3. Security

- Credentials: must use `compressAndEncrypt/decryptAndDecompress` from `encrypt-compress.ts` — never stored or logged in plaintext. Check for console.log of auth objects or request bodies containing tokens.
- Route auth: every new Fastify route must have config.security. A route without this is an unauthenticated endpoint — BLOCKER.
- SQL injection: use TypeORM repositories via repoFactory or query builder with parameterized values. Raw `query()` calls with string interpolation are a BLOCKER.
- XSS: user-controlled strings rendered in React must be escaped; dangerouslySetInnerHTML is a BLOCKER.
- SSRF: user-supplied URLs passed to fetch/axios in block `run()` functions without allowlist validation.
- Insecure deserialization: JSON.parse on untrusted input without schema validation (use AJV or TypeBox).
- Secrets in logs: no logging of auth, connectionValue, request bodies containing tokens, or EncryptedObject values. Check logger.info/logger.debug calls.

---

### 4. Database migration safety

Migrations run on live data at startup. Any of these is a production outage:

- `NOT NULL` column added without a `DEFAULT` or a backfill step
- Column dropped while still referenced in ORM entities or queries
- Migration not registered in the project's migration registry
- Index added without `CONCURRENTLY` on a large table (locks the table)
- Migration that modifies data (UPDATE/DELETE) without a WHERE clause guard or batch size limit — can lock tables for minutes

---

### 5. API contract compatibility

The shared types in packages/shared/ and REST endpoints in packages/server/api/ are the contract between frontend and backend. The frontend (packages/react-ui) uses Axios via api.ts and qs for query strings. Breakage here is silent: the frontend compiles but behaves incorrectly at runtime.

- Required field removed or renamed → frontend crashes on existing responses
- Optional field made required → old clients sending the old shape get 400s (TypeBox schema validation rejects)
- TypeBox schema definition changed without updating the corresponding TypeScript type in packages/shared (or vice versa)
- Pagination shape changed: this project uses cursor-based pagination via buildPaginator/paginationHelper — ad-hoc pagination is a deviation
- New endpoint missing from the frontend's API layer in packages/react-ui or packages/ui-kit

---

### 6. Performance & scalability

- N+1 queries: loading a list then fetching related records one-by-one in a loop. TypeORM's relations or leftJoinAndSelect should be used instead.
- Missing index on a new column used in a WHERE or ORDER BY clause
- Unbounded query: no `LIMIT` on a `find()` that could return millions of rows
- Synchronous work inside an async hot path (e.g., `JSON.parse` of a large execution state in a request handler)
- Memory leak: event listeners or intervals registered without cleanup in React components or long-running worker services
- Redis cache operations without TTL: cacheWrapper calls should always specify expiry; unbounded caches cause OOM

---

### 7. Error handling & observability

- Errors swallowed with empty `catch {}` or `catch (e) { return null }`
- ApplicationError thrown with a generic ErrorCode (like INTERNAL_SERVER_ERROR) when a more specific code exists (e.g., ENTITY_NOT_FOUND, VALIDATION, PERMISSION_DENIED). The Fastify error handler in packages/server/api/src/app/helper/error-handler.ts maps codes to HTTP status — wrong code = wrong status.
- Stack traces or internal details exposed in API error responses
- Missing structured logging context: errors logged without the flowRunId, flowId, userId, or operation name needed to debug in production. Use logger from @openops/server-shared with context objects.
- `console.log` left in production code paths

---

### 8. Concurrency & race conditions

- Two workers or requests can modify the same flow run record without a lock or optimistic concurrency check. The worker dequeue must be atomic.
- Check-then-act pattern without atomicity: `if (!exists) create()` without a unique constraint or transaction
- Cache invalidation: a write updates the database but not inFlightRunStateCache (or the other cacheWrapper calls), leaving stale state that the worker acts on.
- Semaphore leaks in job-polling.ts: if an error occurs between acquire and release, the semaphore is permanently consumed. Check that release is in a finally block.

---

### 9. Block correctness

Blocks live in packages/blocks/<name>/src/lib/actions/ and packages/blocks/<name>/src/lib/triggers/. They implement the interface from packages/blocks/framework.

- Auth errors (401/403) from cloud providers must surface as ApplicationError — not swallowed or retried forever
- Rate limit errors (429) must be retried with backoff, not silently dropped
- Partial failures in batch operations must not be treated as full success
- Actions that mutate external state must set isWriteAction: true in their createAction() definition
- Trigger run() functions: TriggerStrategy.POLLING triggers must be idempotent and handle deduplication — processing the same event twice corrupts user workflows
- Props: Property.ShortText, Property.Number, etc. with required: true must have their undefined case handled if a previous prop's value affects whether they appear (dynamic props)

---

### 10. Frontend correctness

- React hook rules: hooks called conditionally or inside loops
- All user-facing strings must use i18n — no hardcoded English copy (check for string literals in JSX)
- New routes must have errorElement: `<RouteErrorBoundary />` in `router.tsx`
- `useEffect` cleanup: subscriptions, timers, abort controllers, and socket listeners cleaned up on unmount
- Loading and error states handled — no component that renders nothing while fetching (react-query's isLoading/isError must be checked)
- Zustand store updates: check that selectors are granular — subscribing to an entire store object causes unnecessary re-renders
- API calls: must use the Axios wrapper from api.ts (not raw fetch) and qs for query string serialization

---

### 11. TypeScript discipline

- No `any` — use `unknown` and narrow, or define the type
- Exported functions have explicit return types
- TypeBox schema definitions (used for Fastify route validation) must stay in sync with their TypeScript type equivalents in packages/shared
- Type assertions (`as Foo`) without a runtime check are a smell — flag if the assertion could be wrong at runtime (especially on deserialized JSON or API responses)

---

### 12. Configuration & dependencies

- New environment variables must be added to .env.template with a comment explaining their purpose — missing vars cause silent failures at startup via system.get() / system.getOrThrow()
- New system properties should be added to the appropriate SystemProp enum in packages/server/shared
- New `package.json` dependencies: are they actively maintained, appropriately licensed (check CI's check-licenses job), and not pulling in a large transitive tree for a small utility?
- Nx project boundary violations: imports crossing package boundaries that the @nx/enforce-module-boundaries lint rule would reject. A block importing from packages/server/api is always wrong.

---

### 13. Test coverage

Tests live in tests/ folders alongside the code.

- New blocks and API routes need tests; a change without tests is a RISK — flag it
- Tests must assert meaningful behavior: expect(result).toBeDefined() without asserting what is defined is not a test
- Happy-path-only tests that miss the failure modes introduced by this change
- Integration tests that hit the database are required for migration changes — unit tests with mocks are insufficient here
- Block tests: mock the external API (don't hit real AWS/Azure/GCP) but assert that the correct API calls are made with the correct parameters
- Use `jest.mock()` for external dependencies; avoid testing implementation details

---

**Do not flag** formatting, naming, whitespace, or style — the ESLint/Prettier config owns that.

Do not flag pre-existing issues in unchanged code unless the diff makes them newly dangerous.

Deviating from an established pattern without explanation is itself a finding — this codebase is consistent by design.

---

## Phase 3b: Validate & Score

Group candidate issues into batches of 3–4 and launch one **validation subagent per batch** via the Agent tool. Run all batches in parallel.

Each subagent receives:

- The batch of candidate issues (file, line, category, problem, evidence, impact, fix for each)
- The diff hunks ± 10 lines of surrounding context for each issue
- PR title and description
- Relevant AGENTS.md section

**The subagent has `Read`, `Glob`, and `Grep` and must use them.** The ± 10-line window is a starting point, not the limit. Many of the strongest findings are cross-file — "column dropped while still referenced in an ORM entity", "endpoint missing from the frontend API layer", "TypeBox schema out of sync with the `packages/shared` type", "block imports from `packages/server/api`". A subagent that cannot see the referenced file **must open it** before voting, not DROP the issue as unverifiable or rubber-stamp it. Resolve the claim against the actual repo: open the entity/type/route/caller the finding depends on and confirm the relationship holds on the post-change tree.

The subagent independently verifies each issue and returns a result per issue:

| Field      | Value                                            |
| ---------- | ------------------------------------------------ |
| `verdict`  | `CONFIRMED` / `DOWNGRADED` / `QUESTION` / `DROP` |
| `score`    | 0–100                                            |
| `problem`  | refined one-line statement of what is wrong      |
| `evidence` | the specific line(s) or pattern that prove it    |
| `impact`   | what breaks, who is affected, blast radius       |
| `fix`      | concrete suggestion                              |

**Verdict meanings:**

| Verdict      | Meaning                                                             |
| ------------ | ------------------------------------------------------------------- |
| `CONFIRMED`  | Real issue with clear evidence                                      |
| `DOWNGRADED` | Real but lower severity than originally assessed                    |
| `QUESTION`   | Cannot confirm or deny — author clarification needed; include as-is |
| `DROP`       | False positive; discard                                             |

**Confidence scale:**

| Score  | Meaning                  |
| ------ | ------------------------ |
| 0–49   | Likely false positive    |
| 50–74  | Possibly real, uncertain |
| 75–89  | Real and worth noting    |
| 90–100 | Certain — must address   |

**Filter:** discard any issue with verdict `DROP` or score below **75**. Keep all `QUESTION` verdicts regardless of score.

---

## Phase 4: Preview & Confirm

Display validated findings grouped by severity, findings first then summary:

```
PR #{PR_NUMBER}: {PR_TITLE} (by {PR_AUTHOR})
Files changed: {N}

--- BLOCKER (must fix before merge) ---
[95] packages/server/api/.../migration.ts:42
  Problem:  NOT NULL column added with no DEFAULT
  Evidence: line 42 — `ALTER TABLE ... ADD COLUMN name TEXT NOT NULL`
  Impact:   startup migration fails on any database with existing rows
  Fix:      add DEFAULT '' or make the column nullable

--- RISK (merge only as a deliberate decision) ---
[82] packages/blocks/aws/src/actions/s3.ts:17
  Problem:  auth error swallowed silently in run()
  Evidence: catch block returns null without re-throwing
  Impact:   workflow marks step as success on 401/403; user never sees the error
  Fix:      re-throw after logging

--- NOTE (author's call) ---
[80] packages/react-ui/src/.../page.tsx:33
  Problem:  hardcoded English string not in i18n
  Fix:      wrap with t()

--- QUESTION (needs author clarification) ---
packages/engine/src/handler.ts:88
  Question: Is this path ever reached when retryCount > 0? If so, the side-effect
            on line 91 could fire twice. If not, a comment explaining the invariant
            would prevent future confusion.

--- Filtered out ---
N low-confidence issues omitted

--- Already covered by other reviewers ---
(list if any)
```

**If CI** (`GITHUB_ACTIONS=true`): skip interaction, write findings to `/tmp/review-{PR_NUMBER}.md`, continue to Phase 5.

**If local**: use `AskUserQuestion` with options:

1. **Post all** — post everything as shown
2. **Discuss individually** — go through each finding (approve / edit / skip)
3. **Cancel** — exit without posting

---

## Phase 5: Post

### LOCAL mode

Terminal output only. No posting. Ask if the user wants to discuss any findings.

### PR mode — always write the review file

Write to `/tmp/review-{PR_NUMBER}.md`:

```markdown
<!-- claude-pr-review-summary -->

## Claude PR Review — #{PR_NUMBER}: {PR_TITLE}

**Author:** {PR_AUTHOR} | **Base:** `{BASE_REF}` | **Labels:** {PR_LABELS}

### Verdict

SHIP | SHIP WITH CARE | HOLD — one sentence.

### Summary

2–3 sentences on what this PR does and its overall risk level.

### Findings

**[BLOCKER]** `file.ts:42`
Problem: what is wrong. Evidence: the specific line/pattern. Impact: blast radius. Fix: concrete step.

**[RISK]** `file.ts:17`
Problem: what is wrong. Evidence: the specific line/pattern. Impact: blast radius. Fix: concrete step.

**[NOTE]** `file.tsx:33` — observation and suggestion.

**[QUESTION]** `file.ts:88` — what needs author clarification and why it matters.

### Testing gaps _(if any)_

What is untested.
```

If the change is genuinely low-risk: "LGTM — no reliability concerns."

### PR mode — post inline comments

**If local**: post only if the user approved in Phase 4.
**If CI**: post directly (no confirmation needed).

Inline comments are posted by **submitting a single GitHub review via `gh api`** — not through any MCP tool. This is the only mechanism that works identically in CI and locally: `gh` is already authenticated in both (the `GH_TOKEN` set on the CI step, your local `gh auth`), it needs no MCP server, and it is immune to the `claude-code-action` inline-comment buffering and its `context.isPR` / `workflow_dispatch` gate.

Unlike the summary comment, inline review threads are **not** upserted — a re-run would post duplicate threads. Before building the payload, cross-reference the existing inline comments fetched in Phase 2 (their `path` + `line` + body) and skip any finding already raised on the same line, whether by Claude or another reviewer. Only include inline comments that are genuinely new.

**Only include lines that are part of the diff.** GitHub rejects the _entire_ review (HTTP 422) if any single comment targets a line that is not an added/changed line on the right side of the diff (unchanged context lines are not addable). Before building the `comments` array, drop any finding whose line is not present as a `+`/changed line in the hunks — move it to the summary comment instead. A finding on a real but unaddable line is still worth reporting; it just cannot be an inline thread.

Build the comments array (one entry per new finding that maps to a diff line) and submit the review. Use `side: "RIGHT"` for added/changed lines (`"LEFT"` for a deleted line); for a multi-line range add `"start_line"` alongside `"line"`. Construct the JSON with `jq` so finding bodies with quotes/newlines/backticks are escaped correctly — never string-interpolate the body into the JSON:

```bash
# $COMMENTS_JSON is a JSON array: [{"path":...,"line":...,"side":"RIGHT","body":"**[CATEGORY]** ..."}, ...]
jq -n --argjson comments "$COMMENTS_JSON" \
  '{event: "COMMENT", body: "", comments: $comments}' > /tmp/review-payload-{PR_NUMBER}.json

gh api repos/$OWNER/$REPO_NAME/pulls/{PR_NUMBER}/reviews \
  --method POST \
  --input /tmp/review-payload-{PR_NUMBER}.json
```

`body: ""` is intentional — the verdict lives in the summary comment, not the review body, so there are not two separate posts.

If the review POST still fails (e.g. a line slips through and the API returns 422), **do not lose the findings**: fall back to including every inline finding in the summary comment under a `### Inline findings` heading, so the review is never silently dropped. Report the fallback in your final message.

Findings that cannot be mapped to a diff line are included in the summary comment (next step) rather than posted separately.

After posting the review, upsert the summary comment — update if one already exists, otherwise create:

```bash
EXISTING=$(gh api repos/$OWNER/$REPO_NAME/issues/{PR_NUMBER}/comments \
  --jq '[.[] | select(.body | startswith("<!-- claude-pr-review-summary -->"))] | first | .id // empty')

# --raw-field (not --field): --field coerces values that look like
# true/false/null/numbers, which would mangle a markdown body.
if [ -n "$EXISTING" ]; then
  gh api repos/$OWNER/$REPO_NAME/issues/comments/$EXISTING \
    --method PATCH \
    --raw-field body="$(cat /tmp/review-{PR_NUMBER}.md)"
else
  gh api repos/$OWNER/$REPO_NAME/issues/{PR_NUMBER}/comments \
    --method POST \
    --raw-field body="$(cat /tmp/review-{PR_NUMBER}.md)"
fi
```

---

## UPDATE mode (PR mode only)

First run Phase 1 setup (resolve `$OWNER`/`$REPO_NAME`, check working tree). Then fetch all top-level unresolved review threads:

```bash
gh api repos/$OWNER/$REPO_NAME/pulls/{PR_NUMBER}/comments \
  --jq '[.[] | select(.in_reply_to_id == null)]'
```

For each thread, determine the action needed:

1. **The author's response is wrong** → draft: "We can resolve this because XYZ"
2. **The author asked a question** → draft an answer
3. No action needed → skip

Preview planned responses using the same `AskUserQuestion` flow as Phase 4. Post approved replies via `gh api` (escape the body with `jq` so quotes/newlines survive):

```bash
gh api repos/$OWNER/$REPO_NAME/pulls/{PR_NUMBER}/comments/{COMMENT_ID}/replies \
  --method POST \
  --raw-field body="$REPLY"
```
