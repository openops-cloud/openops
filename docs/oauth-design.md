# External Agent OAuth — Design

**Date:** 2026-07-27
**Status:** Approved
**Linear:** Fixes OPS-4673
**Supersedes:** the `feat/mcp-oauth-authentication` spike in `openops-internal` and its
three specs (2026-07-20 base, 2026-07-21 hardening, 2026-07-21 generalization). This is
a fresh design informed by an adversarial security audit of that spike.

## Problem

OpenOps ships a Python **FastMCP** server (`mcp-server/`) that exposes a filtered set of
OpenOps API routes as MCP tools. Today it authenticates with a single static
`AUTH_TOKEN` env var used as a `Bearer` JWT on every API call. That works for the
built-in AI chat (the Node API spawns it over stdio and injects a short-lived `SERVICE`
JWT) but not for **external agents** — Claude Code, Codex, Claude.ai/ChatGPT connectors,
M365 Copilot, partner CLIs — which need a self-service, revocable credential that works
when SSO is enabled and password login is disabled (OPS-4673).

## Requirements (locked)

1. **Clients:** all of — M365 Copilot (strictest: OAuth 2.1 + DCR + Streamable HTTP,
   valid discovery, no API keys), Claude.ai/ChatGPT web connectors, dev CLIs
   (Claude Code/Codex, loopback redirects), and custom/partner agents calling the
   **REST API directly** with an OAuth token (no MCP in between).
2. **Deployments:** cloud **and** self-hosted → the authorization server ships inside
   the OpenOps product (Node API) and delegates login to whatever auth the deployment
   uses. No dependency on Frontegg or any external IdP.
3. **Topology:** one MCP server co-deployed per OpenOps instance (path-routed on the
   same public host). Not multi-tenant.
4. **Connections:** a user may hold **several independent connections**, including
   more than one for the same agent. Each is authorized, listed and revoked on its
   own. Single full-access scope per resource in v1 (`mcp`, `api`).
5. **Projects:** every OAuth-issued token carries a required `project_id` claim and
   acts only on that project, so an individual token's authority is fixed for its whole
   life and cannot be redirected by changing stored state. A _connection_ is not fixed:
   it can act wherever its user can, by asking for a different project when it gets a
   token. That mirrors how enterprise's `POST /v1/authentication/switch-project` issues
   a new token per project rather than mutating state — the switch produces a new
   credential, never a rewritten one. The bound is the user's own membership, re-read on
   every mint and again on every request, so a connection can never reach further than
   its user could in the browser. This edition has one project per organization, so
   there is usually nowhere else to go; the mechanism is the same either way.
6. **Revocation is a hard requirement:** users/admins revoke a connection and it stops
   working promptly.

## Standards targeted

- **OAuth 2.1** (PKCE mandatory, refresh rotation, exact redirect matching).
- **MCP Authorization spec 2025-11-25**: RFC 9728 Protected Resource Metadata +
  `WWW-Authenticate`; RFC 8414 AS metadata **and** OIDC-Discovery-compatible document;
  RFC 8707 resource indicators; DCR (RFC 7591) now, CIMD (SEP-991) as a follow-up.
- **RFC 8693** token exchange (RS → API-audience tokens; no token passthrough).
- **RFC 7009** revocation; **RFC 9207** `iss` authorization-response parameter.
- Honest metadata only: nothing advertised that isn't actually served.

## Audit findings this design must fix (from the spike review)

| ID    | Finding                                                                                                                               | Fix in this design                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| H1    | Refresh-token reuse undetected                                                                                                        | Token **families**; reuse revokes the family                                                                                        |
| H2    | Grant revocation didn't revoke refresh tokens                                                                                         | Revocation cascades via indexed `grantId`                                                                                           |
| H3    | Consent forgeable from URL params (one-click account grant)                                                                           | Server-side **pending-authorization record**; consent references an opaque `request_id`; client metadata rendered from DB only      |
| H4    | Open redirect on Deny                                                                                                                 | Deny goes through the server; redirect validated against registered URIs                                                            |
| M1    | Code/refresh consumption race (read-then-write)                                                                                       | Atomic conditional `UPDATE … WHERE consumedAt IS NULL`                                                                              |
| M2    | Static form-field exchange secret, `change-me` default, unrate-limited                                                                | RS is a **confidential client** with a generated high-entropy secret (hashed at rest), `client_secret_basic`, rate-limited failures |
| M3    | Audience deny-list in one handler; websockets bypass                                                                                  | **Positive** audience enforcement inside `extractPrincipal` (single chokepoint)                                                     |
| M4    | One HS256 secret signs everything; fake `jwks_uri`                                                                                    | Dedicated **RS256 keypair + real JWKS** for OAuth tokens                                                                            |
| M5    | In-process `_active_project_by_user` map (cross-session leakage, restart loss)                                                        | No mutable server-side project state: the project is a claim on each token, and switching mints a new token rather than editing one |
| M6    | 2× remote exchange per tool call; proceeds unauthenticated on failure                                                                 | Local JWKS validation; exchange only to mint API tokens, cached, **fail-closed**                                                    |
| M7    | Non-RFC 6749 error bodies                                                                                                             | Dedicated OAuth error serializer for `/v1/oauth/*`                                                                                  |
| M8    | Phantom grants at consent                                                                                                             | Grant created at code redemption, not at consent (repeat authorizations are intentionally separate connections)                     |
| L1–L6 | DCR validation gaps, cleanup gaps, migration nits, lying metadata, cookie-over-bearer precedence, `/switch-project` minting primitive | Addressed in the relevant sections below                                                                                            |

## Architecture

### Roles

- **Node API (Fastify)** — OAuth 2.1 **Authorization Server** (new module
  `packages/server/api/src/app/oauth/`) _and_ a protected resource: the `direct` token
  model lets CLIs call the REST API with an OAuth token (`aud = api`). Login/consent
  ride the existing app session, so SSO and password deployments both work.
- **Python FastMCP server (`mcp-server/`)** — MCP **Resource Server** over Streamable
  HTTP. Validates inbound bearers **locally** via the AS JWKS (FastMCP `JWTVerifier` +
  `RemoteAuthProvider`). Never forwards the client token: per tool call it exchanges it
  (RFC 8693) for a separate short-lived API-audience token, cached, fail-closed.
- **Resource registry** (static config in the AS): `mcp` (canonical URI = public MCP
  URL, token model `exchange`) and `api` (canonical URI = API URL, token model
  `direct`). `resource` on `/authorize` and `/token` is validated against it
  (`invalid_target` otherwise) and binds the token `aud`.

### End-to-end flow

1. Client → `https://<host>/mcp` unauthenticated → `401` +
   `WWW-Authenticate: Bearer resource_metadata="…"`.
2. Client fetches `/.well-known/oauth-protected-resource[/mcp]` (served by RS) → learns
   the AS issuer.
3. Client fetches AS metadata (RFC 8414 and/or OIDC discovery), registers via DCR,
   opens `/oauth/authorize` with PKCE (S256) + `state` + `resource`.
4. AS validates everything, persists a **pending-authorization record**, sends the
   browser to Settings → Connected apps with only an opaque `request_id`.
   Unauthenticated users go through normal app login (SSO-aware) first.
5. The consent dialog fetches client metadata **from the server by `request_id`** (never
   from URL params), user approves/denies. Approve → single-use code bound to the
   record; deny → server-validated `error=access_denied` redirect. Dismissing the dialog
   denies, so a client is never left waiting on a decision the user has walked away
   from. Both redirects carry `state` and `iss` (RFC 9207).
6. Client exchanges code at `/oauth/token` (PKCE verifier + `resource`) → RS256 access
   token (`aud` = resource) + rotating refresh token. Grant activated/upserted here.
7. MCP calls: RS validates locally via JWKS (issuer + audience + exp), exchanges for an
   API-audience token (cached ≈60s, fail-closed), calls the API. Direct clients skip
   the RS and hit the API with their `aud=api` token.
8. API-side: `extractPrincipal` verifies signature by `kid`, enforces `aud=api`
   positively, maps claims → `SERVICE` principal with the user's **real project role**,
   and checks grant status (cached ≈60s) → revocation cuts access in ~1 minute.

## Tokens & keys

### Why a dedicated asymmetric keypair

Today every JWT (sessions, worker ~100y tokens, engine, AI-chat) is HS256 under the one
`OPS_JWT_SECRET`. Symmetric signing means whoever can _verify_ can also _mint_ — so the
verification key can never be shared with the Python RS (forcing the spike into remote
validation per request), and a single leak forges every principal type.

OAuth-issued tokens are therefore signed with a **dedicated RS256 keypair**:

- The **public key** is published at a real `GET /.well-known/jwks.json`; the RS (and
  any future resource server) validates tokens locally, in-process. An AS blip no
  longer takes down MCP traffic.
- RS256 over EdDSA purely for client compatibility (M365, Python/Node stacks all verify
  RS256 out of the box). Ed25519 is a documented follow-up.
- **Two isolated trust domains:** the internal HS256 world is untouched (zero
  regression on workers/engine/sessions); compromising the OAuth key forges only
  OAuth tokens — which remain subject to the per-request grant-status check, so the
  damage is revocable. Compromising `OPS_JWT_SECRET` no longer exposes external-agent
  auth and vice versa.

### Key management

- **Bootstrap:** on first boot the API generates an RSA-2048 keypair, encrypts the
  private key with the existing AES-256-CBC mechanism (`encrypt-compress.ts`, same
  protection level as app-connection credentials), stores it in `oauth_signing_key`,
  serves the public half in the JWKS. Zero new config for self-hosted; multi-instance
  replicas share the key via the DB (creation is guarded by a unique active-key
  constraint so concurrent boots converge).
- **Override:** optional system prop pointing at an operator-provided PEM (Vault/KMS
  users) — the DB path is a default, not a cage.
- **Rotation (`kid`-based):** generate key #2, publish both in JWKS, sign new tokens
  with #2, drop #1 from JWKS after every #1-signed token has expired (access TTL is
  15 min, so the horizon is short). Admin-triggerable; also the recovery path for a
  suspected key compromise. Every OAuth JWT header carries its `kid`;
  `extractPrincipal` dispatches on it (legacy internal `kid: '1'` → HS256 path).

### Token shapes

| Token               | Form                            | TTL (default, configurable)       | Notes                                                                                                                         |
| ------------------- | ------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Authorization code  | 32B CSPRNG, SHA-256 hash stored | 60 s, single-use (atomic consume) | Bound to client, redirect_uri, PKCE challenge, resource, user, pending request                                                |
| Access token        | RS256 JWT                       | **15 min**                        | Claims: `iss`, `sub` (userId), `aud` (resource audience), `exp`, `iat`, `jti`, `client_id`, `scope`, `grant_id`, `project_id` |
| Refresh token       | 32B CSPRNG, SHA-256 hash stored | 30 d absolute; rotates on use     | Carries `grantId` + `familyId` (both indexed)                                                                                 |
| Exchanged API token | RS256 JWT, `aud = api`          | ~5 min                            | Minted at token-exchange for the grant's active project; never returned to end clients                                        |

Opaque secrets are never stored in plaintext; comparisons are hash-lookup or
timing-safe. All token responses set `Cache-Control: no-store`.

## Authorization server surface

All under `/v1/oauth/*` + well-known routes, registered **only when
`OPS_OAUTH_ENABLED=true`**, as public routes in the security chain (each endpoint does
its own auth), with a dedicated **RFC 6749 error serializer** (`{"error":
"invalid_grant", "error_description": …}`, correct 400/401 statuses) instead of the
ApplicationError envelope.

- `GET /.well-known/oauth-authorization-server` and
  `GET /.well-known/openid-configuration` — same truthful document: issuer, endpoints,
  `code` response type, `authorization_code`/`refresh_token` grants, S256,
  `token_endpoint_auth_methods_supported: ["none","client_secret_basic"]`, real
  `jwks_uri`, scopes. **No** fake id-token fields. Served from the issuer origin only
  (the spike's RS-origin copy with mismatched issuer is dropped — strict RFC 8414
  clients reject it).
- `GET /.well-known/jwks.json` — active + retiring public keys.
- `POST /oauth/register` (DCR, public): validates and bounds every field
  (`redirect_uris` ≤ 10, https or loopback only, length caps, `grant_types` whitelist —
  **enforced later at `/token`**, L1), returns RFC 7591 bodies/errors. Rate-limited
  per-IP (existing rate-limit module). Registered clients are `token_endpoint_auth_method:
none` (public, PKCE-only).
- `GET /oauth/authorize` — requires a logged-in app session (redirects into normal
  login, SSO-aware, then back). Validates client, **exact** redirect_uri (https or
  loopback; loopback matches any port per RFC 8252), PKCE S256-only, known `resource`,
  scope ⊆ resource scopes. On unknown client/unregistered redirect_uri: render an error
  page, **never redirect**. On success: persist `oauth_pending_authorization`
  (~10 min TTL, single-use) and redirect the browser to Settings → Connected apps with
  only `?request_id=<opaque>`.
- `GET /oauth/requests/{id}` (USER session) — consent-page data: client name
  from the **DB**, scopes, resource id. Any signed-in user holding the (unguessable)
  request id can read it: the record is not bound to a user until the decision is
  submitted.
- `POST /oauth/requests/{id}/decision` (USER session) — `{approve: boolean}`.
  Atomically consumes the pending record (its single-use consumption is the CSRF/replay
  barrier; the session cookie is `sameSite: lax`, and the route additionally requires a
  custom header to defeat form-post CSRF). Approve → upsert grant (see below), issue
  code, return the validated redirect URL (`code`, `state`, `iss`). Deny →
  `error=access_denied` redirect URL, equally validated. The frontend only ever
  navigates to server-returned URLs (fixes H3 + H4).
- `POST /oauth/token` (public, rate-limited with failure-weighted limits):
  - `authorization_code` — atomic single-use consume; verify PKCE (timing-safe),
    client, redirect_uri, resource; enforce the client's registered `grant_types`;
    mint access + refresh (new `familyId`), activate the grant.
  - `refresh_token` — atomic rotate; **reuse of a rotated/revoked token revokes the
    entire family** (H1) and logs a security event; checks grant active + user active
    on every rotation (H2); re-binds `resource`. Accepts an optional `project_id` to
    move the connection, checked against membership **before** the token is consumed, so
    a refused switch does not cost a working credential.
  - `urn:ietf:params:oauth:grant-type:token-exchange` — **RS-only**: authenticated via
    `client_secret_basic` with the RS's confidential client (secret generated at
    provisioning, stored hashed, timing-safe compare, rate-limited failures — M2).
    Validates the subject token (signature, `aud = mcp`, exp), checks grant active +
    user active + membership of the target project, mints the ~5 min `aud=api` token.
    The target defaults to the project the subject token names; the RS may pass
    `project_id` to act elsewhere, which is how an agent switches project. It cannot
    widen beyond the user's own membership, which is re-read here on every exchange.
- `POST /oauth/revoke` (RFC 7009, public with client identification): revokes by
  refresh token → marks grant + family revoked.
- `GET /oauth/grants` / `DELETE /oauth/grants/{id}` (USER, project-scoped policy):
  connected-apps management. Delete = revoke grant **and cascade-revoke all its refresh
  tokens** (indexed `grantId` UPDATE — H2).
- `GET /oauth/projects` (USER **or SERVICE**): the projects the caller may act in, and
  which one they are acting in now. `SERVICE` is allowed because this is the one route a
  connection calls about itself, to find out where it can switch to; it exposes only the
  names of projects the caller already reaches.

### Grant model

`oauth_grant` — one row per **connection**: one completed authorization for one
client and user. Created at code redemption (**not** at consent, so an
authorization the client never finished is not shown as a connection):
`id`, `clientId`, `userId`, `resourceId`,
`status (active|revoked)`, `createdAt`, `lastUsedAt`, `revokedAt`.

The index on `(clientId, userId)` is deliberately **not unique**. Authorizing the
same agent again creates another connection rather than mutating the first, so a
user can run several agents — or several installs of one agent — side by side and
revoke any one of them without disturbing the others. `projectId` is fixed at
authorization time and never mutated (see requirement 5).

Because reconnecting accumulates rows, the cleanup job removes **dead**
connections: those with no unrevoked refresh token left and unused for 30 days. A
connection with any usable refresh token is never touched.

Revocation semantics, per connection: revoked grant → token exchange refuses (MCP
cutoff), the API's grant-status check refuses (direct cutoff), and refresh
refuses, so no new tokens can be minted. Access-token TTL (15 min) is the absolute
worst case, and other connections are unaffected.

### Project authorization

The project a token may act on is a **required `project_id` claim**, minted by the
authorization server and never asserted by the client. Each individual token is
immutable — the project it names is fixed for its whole life, so a leaked token's blast
radius is fixed with it.

The claim is a _selector, not a grant of authority_. Every request that presents an
OAuth token re-authorizes the named project, so withdrawing someone's access takes
effect at their next request rather than at token expiry.

**Switching project.** Because the claim is a selector, a connection is not confined to
one project — it acts wherever the user can, exactly as their browser session does. A
client asks for a different project when getting a token, and membership decides:

- `POST /token` with `grant_type=refresh_token` and `project_id` — how a direct API
  client (CLI, partner agent) moves.
- `POST /token` with the token-exchange grant and `project_id` — how a resource server
  moves on an agent's behalf. This is the path an MCP client such as Claude Code takes,
  since it cannot mint tokens itself.
- `GET /v1/oauth/projects` — where a connection may go, and where it is now. Allows
  `SERVICE` so the connection itself can ask.

A project the user is not a member of is refused with `invalid_target` (RFC 8707), and
on the refresh path the refusal happens **before** the token is consumed, so asking for
the wrong project does not cost a working credential. Nothing is stored: a switch lasts
exactly as long as the token it produced, and `oauth_grant.projectId` continues to
record where the connection started rather than where it is.

The security property is that a switch can never reach further than the user can. The
bound is their own membership, re-read on every mint and again on every request.

The three questions the server asks about projects sit behind one factory,
`getOAuthProjectMembershipService()` — following the convention used by
`authentication-service-factory` and friends, where an edition overrides behaviour
by swapping the import in the factory file:

- `getDefaultForUser(user)` — where a newly authorized connection starts.
- `getForUser(user, projectId)` — whether the user may act there, and as what role.
- `listForUser(user)` — every project the connection may switch to.

`listForUser` must stay consistent with `getForUser`: if it returned less than
`getForUser` permits, a client would be shown one destination while the token endpoint
allowed another it was never told about. This edition answers all three from the
organization's projects with role `ADMIN`, matching the session login path. An edition
with real project membership maps them onto its own lookups (in the enterprise fork,
`usersService.getLandingProjectForUser` and `usersService.getUserProject`, which
already return `{ project, projectRole }`) and gets real per-project roles and
multi-project switching with no change to the OAuth code. `projectRole` is deliberately
typed as `string` here because the role enum lives in enterprise-only shared code.

**The project lives on the refresh token, not the grant.** It was on the grant first,
used as the default when a refresh named no project — which meant a plain renewal put the
connection back where it started, silently discarding a switch. An agent would have moved
to another project and drifted back roughly 15 minutes later, with nothing to attribute it
to. The refresh token is the credential chain, so it is what carries the current project:
rotation copies it forward unless the client asks to move, and renewing a credential
therefore yields an equivalent one. That also left the grant's copy unread, so it is
gone — `test/unit/oauth/tokens.service.test.ts` pins the behaviour.

### Data model (new tables)

- `oauth_signing_key` — `id` (kid), `privateKeyEncrypted`, `publicKeyPem`,
  `status (active|retiring|retired)`, timestamps. A partial unique index over
  `status = 'active'` is what makes concurrent replica boots converge on one key.
- `oauth_client` — DCR clients + the provisioned RS confidential client:
  `id`, `clientName`, `redirectUris` (jsonb), `grantTypes` (jsonb),
  `tokenEndpointAuthMethod`, `clientSecretHash` (nullable), timestamps.
  Usage is recorded per connection on the grant, not per client. No `scope`: a client may
  send one at registration, but what a token gets is decided by the resource it names, so
  storing the request would be a second answer nothing reads.
- `oauth_pending_authorization` — `id` (opaque request_id), `clientId` (FK),
  `redirectUri`, `codeChallenge`, `resource`, `scope`, `state`, `expiresAt`,
  `consumedAt`. No `userId`: the acting user is not known until the decision is
  submitted (see deviation 2).
- `oauth_authorization_code` — `codeHash` (unique), `clientId` (FK), `userId`,
  `redirectUri`, `codeChallenge`, `resource`, `scope`, `expiresAt`, `consumedAt`.
- `oauth_refresh_token` — `tokenHash` (unique), `grantId` (FK, **indexed**),
  `familyId` (**indexed**), `clientId`, `resource`, `scope`, `projectId`, `expiresAt`
  (**indexed**), `revokedAt`. No `userId`: the grant records the acting user and is
  authoritative, so a copy here could only ever disagree. `projectId` **is** here rather
  than on the grant: it is where the chain is currently acting, so a rotation carries it
  forward and a plain renewal stays put.
- `oauth_grant` — as above; FKs with `ON DELETE CASCADE`; no defaulted-to-`''`
  columns (L3); `(clientId, userId)` indexed but **not** unique. No `scope`: it would
  restate `resourceId`, since each resource grants exactly one. No `projectId` either —
  see below. `revokedAt` is write-only on purpose — `status` is what code branches on,
  and this answers "when" for anyone auditing later.

All single-use consumption (pending record, code, refresh rotation) is an atomic
conditional `UPDATE … WHERE … AND consumedAt IS NULL` branching on affected rows (M1).

## API-side enforcement (Node)

- **`extractPrincipal` dispatch by `kid`:** HS256 legacy path unchanged. RS256 OAuth
  path: verify against local keys, require `aud` = API audience (**positive**
  enforcement — an `aud=mcp` token can never authenticate anywhere in the API,
  including the websocket path, M3), map claims → `SERVICE` principal with `sub` as
  userId, the grant's active project, and the user's **real project role** resolved
  from membership (no hardcoded ADMIN); reject missing membership or inactive user.
- **Grant-status check:** for principals carrying `grant_id`, a cached (≈60 s,
  in-process; Redis when available) single-row status read; revoked → 401.
- **Bearer/cookie precedence (L5):** the `Authorization` header wins over the `token`
  cookie in `access-token-authn-handler.ts`, with regression tests for the app's
  cookie-based flows.
- Route policies: OAuth-derived `SERVICE` principals flow through the existing ~40
  `[USER, SERVICE]` route policies unchanged.
- **`SERVICE`, never `USER`.** `ProjectAuthzHandler` rejects a request naming a project
  other than the principal's, but enterprise's `/switch-project` is on that handler's
  ignore list, because minting a token for another project is its whole job. What keeps
  an OAuth connection out of it is its policy,
  `getUnscopedRoutePolicy([PrincipalType.USER])`: a `SERVICE` principal gets
  `403 invalid route for principal type`. Do not build the OAuth principal as `USER`,
  and do not add `SERVICE` to `/switch-project`. OAuth connections switch project
  through the token endpoint instead (below), which is the same capability with the
  membership check kept in one place. Pinned by
  `test/unit/oauth/oauth-principal.test.ts`.
- **`SERVICE` is in `DEFAULT_ALLOWED_PRINCIPAL_TYPES`**, so a route that declares no
  policy is reachable by an OAuth token. The project guard still applies, so this is a
  project-scoped reachability question rather than a cross-project one — but it means
  the set an OAuth connection can touch is "everything not explicitly restricted",
  not "everything explicitly opened". Worth keeping in mind when adding routes.

## Python resource server (`mcp-server/`)

- `MCP_TRANSPORT=stdio` (unchanged, internal AI chat) or `http` (Streamable HTTP,
  `stateless_http=true`).
- **Auth:** FastMCP `JWTVerifier` (`jwks_uri`, `issuer`, `audience = MCP canonical
URI`) wrapped in `RemoteAuthProvider` → serves RFC 9728 PRM (root and path-aware
  variants) and enforces local validation. ASGI middleware adds
  `WWW-Authenticate: Bearer resource_metadata="…"` on 401 (kept from the spike — it
  was correct). Origin-header validation per MCP 2025-11-25 (403 on bad Origin).
- **Downstream calls:** httpx request hook obtains the API token from an
  **exchange-token cache** keyed by `(sha256(subject token), projectId)` with TTL
  `min(remaining subject exp, 60 s)`; on miss, calls `/v1/oauth/token`
  (token-exchange) authenticated with its confidential-client credentials
  (`client_secret_basic`, from env, provisioned at deploy). **Fail-closed:** exchange
  failure aborts the tool call with an MCP auth error; no request ever leaves without
  an `Authorization` header (M6).
- **No project switching:** a connection acts on the project fixed on its grant.
  Multi-project access is enterprise (requirement 5), so the resource server keeps
  no project state of its own — which is also what removes the class of bug behind
  audit finding M5 rather than merely relocating it.
- No AS metadata is served from the RS origin.

## Consent UI (react-ui)

Consent and connection management live in one place — `/settings/connected-apps` — so the
user decides where they later review and revoke.

- **Consent dialog**, shown over that page when the URL carries a `request_id`. Reads
  only the id, fetches `GET /v1/oauth/requests/{id}` and renders the client name **from
  the server**, never from URL params. Plain-language copy naming what is granted,
  including that the connection may act in any project the user has access to. Approve
  and Deny both POST the decision and navigate to the server-returned URL only.
  Dismissing counts as Deny. The response deliberately carries **no project**: a
  connection is not confined to one, and naming the project it starts in would read as a
  limit that does not exist.
- **Connected apps list** on the same page: one row per authorization — not per
  application, since two connections for the same agent are independently revocable —
  with client name, when connected, when last used, and Disconnect behind a
  confirmation. Hidden entirely by the `CONNECTED_APPS_ENABLED` flag when OAuth is off,
  since every route it depends on is then unregistered. All strings i18n; `react` skill
  patterns.

## Abuse controls & hygiene

- Rate limits (existing module, per-IP): `/register`, `/authorize`, `/token`
  (failure-weighted so refresh cadence is never throttled), exchange failures.
- Cleanup job (existing system-jobs): indexed range-deletes of expired pending
  records, codes, and expired refresh tokens; stale-client removal via
  `NOT EXISTS` query (no full-table loads); runs hourly.
  - **Retention is anchored to expiry, including for revoked rows.** A rotated refresh
    token is kept until the moment it could no longer be presented anyway, because that
    is exactly the window in which a replay must be recognised as _reuse_ — which revokes
    the family and logs a security event — rather than reported as an unknown token. An
    independent, shorter window would quietly turn a replay of an older token into a
    plain `invalid refresh token`: still rejected, but with the compromise signal lost
    precisely because the token was old. Growth is bounded by the refresh TTL, so pick
    that TTL with the table in mind rather than adding a second knob here.
  - The **handler is registered on every boot**, including when OAuth is disabled, and
    returns immediately in that case. The schedule lives in Redis and outlives the boot
    that created it, so an instance that enabled OAuth once and later turned it off still
    has the job firing; with no handler registered the worker fails it hourly.
- Security telemetry: log DCR registrations, refresh-reuse family revocations, exchange
  auth failures, revocations.

## Configuration (system props)

| Prop                                                                                                                                        | Default                   | Purpose                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------- |
| `OPS_OAUTH_ENABLED`                                                                                                                         | `false`                   | Registers AS routes + well-known |
| `OPS_OAUTH_ISSUER_URL`                                                                                                                      | derived from frontend URL | `iss`, metadata                  |
| `OPS_OAUTH_ACCESS_TOKEN_TTL_SECONDS`                                                                                                        | 900                       |                                  |
| `OPS_OAUTH_REFRESH_TOKEN_TTL_DAYS`                                                                                                          | 30                        |                                  |
| `OPS_OAUTH_SIGNING_KEY_PEM_PATH`                                                                                                            | unset                     | operator-managed key override    |
| `OPS_MCP_RESOURCE_URL`                                                                                                                      | unset                     | canonical MCP resource URI       |
| RS env: `MCP_TRANSPORT`, `MCP_OAUTH_ISSUER`, `MCP_RESOURCE_URI`, `MCP_CLIENT_ID`, `MCP_CLIENT_SECRET`, `API_BASE_URL`, `OPENAPI_SCHEMA_URL` |                           |                                  |

Deploy: path routing on the public host — `/mcp` + PRM → RS; `/v1/oauth/*` +
well-known → Node API.

## Testing

Every audit finding becomes a regression test. Highlights:

- **Protocol:** PKCE fail/pass, code replay (including **concurrent** replay — M1),
  expiry, cross-client code, redirect mismatch, unknown resource, state/iss round-trip,
  DCR field bounds, registered-grant-type enforcement.
- **Consent binding:** decision without a pending record fails; expired/consumed
  record fails; client name rendered from DB; deny redirect validated (H3/H4).
- **Refresh:** rotation; family revocation on reuse; grant-revoked → refresh refused;
  absolute expiry (H1/H2).
- **Audience:** `aud=mcp` token rejected by REST **and websocket**; `aud=api` accepted;
  legacy HS256 tokens unaffected (M3); exchanged token unusable at the RS.
- **Exchange:** requires RS client credentials; revoked grant/inactive user refused;
  cache respects TTL; fail-closed on AS outage (M6).
- **Keys:** boot generation idempotent across concurrent replicas; rotation keeps old
  tokens valid until expiry; JWKS serves retiring keys.
- **Python:** JWKS validation (valid/expired/wrong-aud/wrong-iss), PRM contents, 401
  challenge header, project-switch persistence.
- **E2E:** scripted MCP client (DCR → authorize → consent → token → tool call →
  refresh → revoke → cutoff) with SSO on and off; stdio AI-chat regression; CLI-style
  direct flow (loopback + `resource=api`).

## Phasing

- **P1 — AS core:** signing keys + JWKS, entities/migrations, DCR, pending-auth
  record + authorize, token endpoint (code/refresh/exchange, atomic consumption,
  families), grants + revocation, OAuth error serializer, discovery docs, rate limits,
  cleanup. Unit + integration tests.
- **P2 — API enforcement:** `extractPrincipal` kid dispatch + positive audience,
  real-role principal mapping, grant-status check, bearer-over-cookie. Regression
  suite.
- **P3 — Python RS:** http transport, JWKS verifier, PRM + challenge middleware,
  exchange client + cache + fail-closed, project-switch tool.
- **P4 — UI:** consent dialog, connected-apps settings page.
- **P5 — Deploy/E2E:** config, path routing, Docker, E2E matrix.

Status: P1, P2 and P4 are complete in this repository. P3 lives in the `openops-mcp`
repository and is complete apart from the project-switch tool — the API side of switching
is built and tested here, but nothing in the resource server calls it yet. P5 is
outstanding in `openops-mcp`: Dockerfile, README, and the Helm values for
`openops-cloud/helm-chart`.

The switch tool needs somewhere to hold the selection, and **that is where audit finding
M5 came from** — an in-process `_active_project_by_user` map that leaked across sessions
and vanished on restart. HTTP mode runs `stateless_http`, so the same map would work on
one instance and silently diverge across replicas. Whatever holds the selection has to be
per-connection and either shared or carried in the request; reaching for a process-local
dictionary would reintroduce the finding this design set out to fix.

## Verification

Unit tests cover each module in isolation. Because those use in-memory
repositories, the guarantees that depend on database semantics are covered
separately in `test/integration/ce/oauth/`: that single-use consumption of codes,
pending records and refresh tokens is atomic under concurrency; that revocation
cascades to one connection's tokens only; and that the cleanup job deletes what has
expired and nothing else. Writing those found a real defect — date cutoffs bound as
ISO strings are compared _textually_ by drivers that store a different textual
format, which matched every row including future ones. Cutoffs are now bound as
`Date` objects (`oauth-query.ts`).

The integration harness runs on SQLite with schema synchronisation, which is not
the production driver. It does replace hand-written mocks with a real ORM and real
SQL, which is where the risk was.

## Deviations found during implementation

Recorded here because each one changes what the code does versus what this
document originally specified.

1. **Project role is resolved through a seam, not hardcoded.** The design called
   for the user's "real project role", which this edition cannot provide: it has no
   per-project role model, and session logins hardcode `'ADMIN'` too. Rather than
   hardcode it in the OAuth path as well, the role comes from
   `getOAuthProjectMembershipService().getForUser(...)`, which returns `'ADMIN'`
   here and the member's actual role in an edition that has one. The v1 scope model
   is still coarse — a single full-access scope means a connected agent can do what
   its user can — but the role is no longer baked into OAuth code.
2. **No `userId` on the pending authorization record.** `GET /authorize` is
   reachable before the user has logged in, so the acting user is not known when
   the record is written; it is taken from the session when the decision is
   submitted and recorded on the grant.
3. **Authorization codes carry no `grantId`.** The grant is created when the code
   is redeemed, which is after the code exists. The code references the client
   and user instead.
4. **A failed redemption consumes the code.** The code is claimed before PKCE and
   the other parameters are checked, so one wrong `code_verifier` burns it. This
   is deliberate — it allows exactly one verifier guess per code — and the cost
   is only that a party who already holds a code can deny the legitimate client
   that one code.
5. **The project moved onto the token; switching then came back, deliberately.** The
   design originally wanted an all-projects grant with runtime switching. That became a
   required `project_id` claim instead, which is what resolves audit finding M5 — no
   mutable project state for sessions to share — and fixes each token's authority for
   its whole life.

   An intermediate step went further and refused to build any switching at all, on the
   grounds that enterprise's `/switch-project` already mints a token per project. That
   was wrong twice over. `/switch-project` is unreachable for an OAuth connection (it
   requires `PrincipalType.USER` and session cookies), so refusing to build a mechanism
   did not defer the capability to enterprise — it removed it. And an agent confined to
   one project is not the parity users expect from a tool acting on their behalf.

   Switching is therefore built here, at the token endpoint, where the membership check
   already lives (see _Project authorization_). The claim stays immutable per token; what
   moves is the connection, by asking for a new token. That keeps M5 resolved — still no
   mutable server-side state — while making the capability reachable.

6. **Revocation is effectively immediate on a single instance**, not merely
   within the ~60 s cache TTL: revoking busts the in-process grant cache. The TTL
   bound applies across replicas, whose caches are not invalidated.
7. **Six columns the design named were removed as write-only.** `oauth_client.lastUsedAt`
   (usage is meaningful per connection, on the grant) and `oauth_signing_key.alg` (one
   algorithm, reported by the JWKS from a constant) went first. A later sweep took
   `oauth_client.scope`, `oauth_grant.scope` and `oauth_refresh_token.userId` for the
   same reason — each was written, and in two cases echoed through an API response, but
   never consulted for a decision. Scope is settled by the resource; the acting user is
   settled by the grant. `oauth_grant.revokedAt` was kept despite being write-only: it is
   an audit answer to "when", which `status` alone cannot give.

   `oauth_grant.projectId` was the sixth, and the only one whose removal fixed a bug
   rather than just saving a column. It was read — as the default when a refresh named no
   project — and that default was wrong: a plain renewal returned the connection to where
   it started, discarding a switch made minutes earlier. The project moved to
   `oauth_refresh_token`, which is the chain being rotated, so renewal now preserves it.

8. **Bearer now beats the session cookie** in `access-token-authn-handler.ts`
   (was cookie-first). A caller presenting a token is stating which identity it
   wants; preferring an ambient cookie would authenticate it as someone else.

## Deferred (tracked follow-ups)

- CIMD client registration (SEP-991) — accept URL client_ids.
- Fine-grained scopes (read/write, per-capability) + incremental consent (SEP-835).
- DPoP sender-constrained tokens.
- Ed25519 signing option.
- Multi-tenant/central MCP topology (would reuse the JWKS trust model as-is).
- A user-supplied label per connection. Connections are currently told apart by
  client name, creation time and last use, which is thin when someone connects the
  same agent from two machines.

## Out of scope

- Per-project _consent_. A connection is authorized against the user's account and may
  act in any project they can reach, which is the parity a tool acting on someone's
  behalf needs. Letting a user grant one project and withhold another would be a
  finer-grained consent model, and belongs with the scopes work below.
- API keys / PATs (M365 Copilot cannot use them).
- RFC 7592 client management endpoints.
- Changes to internal HS256 token flows (sessions, worker, engine, AI-chat stdio).
