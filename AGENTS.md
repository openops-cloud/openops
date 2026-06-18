# Agent Onboarding — openops-cloud/openops

**OpenOps** is a no-code FinOps automation platform for cloud cost optimization. Users build and execute workflows to automate cost-saving processes across AWS, Azure, and GCP, with a built-in spreadsheet-like database (OpenOps Tables) for structured data and collaboration.

Work from the repo root. Prefer small, scoped changes. Avoid unrelated refactors.

---

## Repo Structure

This is an Nx monorepo. Source code lives under `packages/`. In production we build two container images: **App** (UI + API) and **Worker**.

Key packages:

- `packages/server/api` — Fastify API server; handles auth, flow management, app connections, and all REST endpoints _(App container)_
- `packages/server/worker` — workflow execution runtime; manages the engine process pool, job polling, and webhook handling _(Worker container)_
- `packages/server/shared` — shared server utilities: logging, caching, AES-256-CBC encryption (`packages/server/shared/src/lib/security/encrypt-compress.ts`)
- `packages/engine` — workflow execution engine; runs as isolated child processes spawned by the worker
- `packages/react-ui` — React 18 frontend (Vite + TailwindCSS) _(App container)_
- `packages/shared` — shared types, error codes, and utilities across frontend and backend
- `packages/blocks/` — 50+ composable integration blocks (AWS, Azure, GCP, Slack, etc.) built on `packages/blocks/framework`
- `packages/ui-components` — reusable component library (Storybook)
- `packages/ui-kit` — frontend tools, socket context, and API utilities

Other important files:

- `nx.json` — Nx target defaults and caching config
- `.env.template` — template for local environment variables; copy to `.env` before running
- `.github/workflows/ci.yml` — source of truth for CI lint/test/build behavior
- `.github/pull_request_template.md` — required PR body format

---

## Tech Stack

- **Backend:** Fastify, TypeORM 0.3 (PostgreSQL or SQLite), JWT auth with secure cookie sessions
- **Frontend:** React 18, Zustand, react-query v5, shadcn, Axios (via `api.ts` wrapper), `qs` for query strings
- **Testing:** Jest
- **Validation:** AJV for JSON schema; typed `ApplicationError` codes mapped to HTTP status codes

---

## Local Development Setup

### Prerequisites

- Node v24.16.0 (pinned in `.nvmrc`)
- Docker (for Postgres, Redis, OpenOps Tables, Analytics)

### First-time setup

```bash
cp .env.template .env   # fill in any missing values
npm ci --no-audit --no-fund
```

> **arm64 / Apple Silicon:** `.env.template` already includes `NODE_OPTIONS=--no-node-snapshot`, required for the `isolated-vm` sandbox package.

### Starting the app

```bash
npm start   # runs docker compose up + npm run dev in one step
```

Or manually:

```bash
docker compose up -d   # start Postgres, Redis, OpenOps Tables, Analytics
npm run dev            # start all services concurrently
```

Running services:

| Service                | URL                   |
| ---------------------- | --------------------- |
| Frontend (react-ui)    | http://localhost:4200 |
| API (server/api)       | http://localhost:3000 |
| Worker (server/worker) | http://localhost:3010 |
| OpenOps Tables         | http://localhost:3001 |
| Analytics              | http://localhost:8088 |

Default admin credentials: `local-admin@openops.com` / `12345678`

---

## Making Code Changes

1. Identify the affected Nx project(s) before writing any code.
2. Run focused, project-scoped commands while iterating.
3. Before finalizing, run lint, tests, and build for all changed projects.

**Project-scoped commands (preferred while iterating):**

```bash
npx nx lint <project>
npx nx test <project>
npx nx build <project>
```

**Full monorepo commands (for final validation):**

```bash
npx nx run-many --target=lint --quiet
npx nx run-many --target=test --quiet -- --silent
npx nx run-many --target=build
```

---

## Common Development Tasks

### Adding a new API route

Routes use Fastify + TypeBox schemas + RBAC. Pattern from `packages/server/api/src/app/flows/`:

```typescript
import { getProjectScopedRoutePolicy } from '../core/security/route-policies/route-security-policy-factory';
import { Type } from '@sinclair/typebox';

const CreateThingOptions = {
  config: {
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
      permission: Permission.WRITE_FLOW,
    }),
  },
  schema: {
    body: Type.Object({ name: Type.String() }),
    response: { [StatusCodes.OK]: ThingSchema },
  },
};

app.post('/', CreateThingOptions, async (request, reply) => {
  // handler
});
```

Register the controller in your module:

```typescript
await app.register(thingController, { prefix: '/v1/things' });
```

Every new route **must** have an explicit RBAC policy via `getProjectScopedRoutePolicy()`.

### Adding a database migration

```bash
npx nx db-migration server-api -- --name descriptive-name
```

This generates a file in `packages/server/api/src/app/database/migrations/` with a Unix timestamp prefix (e.g., `1776097737024-DescriptiveName.ts`). Manually register it in `postgres-connection.ts` via `getMigrations()`. Migrations run automatically on startup when `RUN_DB_MIGRATIONS` is true.

### Adding a new block or integration

Use the CLI generators from the repo root:

```bash
npm run create-block    # scaffold a new block package
npm run create-action   # add an action to an existing block
npm run create-trigger  # add a trigger to an existing block
npm run sync-blocks     # sync block metadata
```

Action structure (`packages/blocks/<name>/src/lib/actions/`):

```typescript
import { createAction, Property } from '@openops/blocks-framework';

export const myAction = createAction({
  name: 'action_name',
  displayName: 'Display Name',
  description: '...',
  isWriteAction: true,
  auth: myAuth,
  props: {
    resourceId: Property.ShortText({
      displayName: 'Resource ID',
      required: true,
    }),
  },
  async run(context) {
    // implementation
  },
});
```

Trigger types: `TriggerStrategy.POLLING`, `WEBHOOK`, `APP_WEBHOOK`, `SCHEDULED`.

### Adding a frontend page

Pages live in `packages/react-ui/src/app/routes/<page-name>/`. Register in `packages/react-ui/src/app/router.tsx`:

```typescript
{
  path: 'things',
  element: <ThingsPage />,
  errorElement: <RouteErrorBoundary />,
}
```

All user-facing strings must use i18n — no hardcoded copy.

### Error handling

Use `ApplicationError` with typed `ErrorCode` from `@openops/shared`:

```typescript
import { ApplicationError, ErrorCode } from '@openops/shared';

// throw
if (!entity) {
  throw new ApplicationError({
    code: ErrorCode.ENTITY_NOT_FOUND,
    params: { entityType: 'Flow', entityId: id },
  });
}

// catch
catch (err) {
  if (err instanceof ApplicationError && err.error.code === ErrorCode.FLOW_NOT_FOUND) {
    // handle
  }
}
```

The Fastify error handler in `packages/server/api/src/app/helper/error-handler.ts` maps `ErrorCode` values to HTTP status codes automatically.

---

## Key Conventions

- All sensitive credentials must be encrypted via `encrypt-compress.ts` in `packages/server/shared` — never inline
- Follow existing code style and patterns in the repository
- Write clear, self-documenting code with descriptive variable and function names
- Include comments for complex logic or non-obvious behavior
- Always write tests for new functionality and changes
- Update documentation for user-facing changes
- Do not introduce new dependencies without discussion
- Prefer the TypeORM repository pattern (`repoFactory`) for data access; avoid raw SQL except in migrations or when there’s a clear performance need.
- Every new API route needs an explicit RBAC policy via `getProjectScopedRoutePolicy()`
- Use the shared pagination helper for cursor-based pagination — do not implement ad-hoc pagination
- Workflow state is managed by `flow-run-service` via an in-flight cache backed by the database
- Keep API contract changes backward-compatible unless a migration is explicitly part of the change

---

## Code Style

Run "npx nx lint" to verify code style before committing.

### Formatting

- **Indentation:** 2 spaces (TypeScript/JavaScript, shell scripts)
- **Line length:** 100–120 characters preferred
- **Braces:** Required for all control blocks, even single-line
- **Spacing:**
  - One space between keywords and parentheses: `if (condition) {`
  - No trailing whitespace
  - Newline at end of file
- **Linting:** Use ESLint as configured in each package
- **Formatting:** Follow Prettier rules if configured
- Respect `.editorconfig`, `.eslintrc`, `.prettierrc`, and other config files

### Naming Conventions

- **Variables/functions:** `camelCase`
- **Classes/types:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Files:** lowercase with hyphens (e.g., `user-profile.ts`)

### TypeScript

- Use proper types and interfaces — avoid `any`
- Prefer `const` over `let`; avoid `var`
- Explicit return types for all exported functions
- Prefer arrow functions for callbacks and functional components

### Comments

- Explain _why_, not _what_ — the code should be self-explanatory
- Use `TODO:` for actionable technical debt
- Document public functions, classes, and modules

---

## Testing

- **TDD** — red-green-refactor. No production code without a failing test first.
- Place unit tests in a `tests/` folder alongside the code.
- Tests must assert meaningful behavior — avoid `toBeTruthy()` or `toBeDefined()` without further assertions.

**Integration tests** (in `packages/server/api/test/integration/`) initialize a real database:

```typescript
beforeAll(async () => {
  encryptUtils.loadEncryptionKey();
  await databaseConnection().initialize();
});
afterAll(async () => databaseConnection().destroy());
```

**Unit tests** (in `packages/server/api/test/unit/`) mock external dependencies via `jest.mock()`. Test helpers and fixtures live in `packages/server/api/test/helpers/`.

**Run tests:** Run tests using Nx commands

```bash
npx nx test <project>          # all tests for a package
npx nx test-unit server-api    # unit tests only for server-api
npx nx test ui-components      # tests only for ui-components
npx nx test engine             # tests only for engine
```

---

## CI Pipeline

CI runs one `install` job first, then the following jobs execute in parallel:

- **audit** — `npm audit`
- **lint** — `npx nx run-many --target=lint --quiet`
- **check-licenses** — validates dependency licenses
- **test** — runs tests in shards across packages
- **build** — `npx nx run-many --target=build`

Mirror this locally when validating a change end-to-end.

---

## Known Warnings (Non-blocking)

- **`NX_REJECT_UNKNOWN_LOCAL_CACHE=0 is not supported`** — remove from local env; conflicts with the newer Nx DB cache.
- **Vite deprecation warnings** (`esbuild` option / `optimizeDeps.rollupOptions`) — warnings only, commands still succeed.
- **Jest ES module warnings** (`Failed to load the ES module ... jest.config.ts`) — tests still execute; treat as known noise.
- **Slow full-monorepo runs** — use project-scoped Nx targets while iterating.

---

## Pull Request Guidelines

- Keep PRs single-purpose and scoped to the issue being addressed
- Only include changes related to the issue — no unrelated modifications
- Follow `.github/pull_request_template.md`
- Include testing notes: what was run, and what was intentionally scoped or skipped
- All PRs must reference a Linear issue in their body (e.g., `Fixes OPS-100`)

### Commit messages

- Use imperative mood: "Fix bug" not "Fixed bug"
- Keep commits small and focused on a single change
- Describe what and why, not how

### PR title requirements

- Must start with a capital letter and a real word
- Must have at least three words
- Must use imperative mood (e.g., "Add GO support" not "Added GO support")

### Reference an issue

All PRs must reference a Linear issue in their body.

Examples:

- Fixes OPS-100.
- Resolves OPS-101.
- Part of CI-102.

## Additional Resources

- [CONTRIBUTING.md](./CONTRIBUTING.md) - General contribution guidelines
- [.github/pull_request_template.md](./.github/pull_request_template.md) - PR template
- [.github/prlint.json](./.github/prlint.json) - PR linting rules
- [docs.openops.com](https://docs.openops.com) - Official OpenOps documentation
