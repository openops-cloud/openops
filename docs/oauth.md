# OAuth for external agents

OpenOps authenticates people through the browser and workflows through the engine. Neither
fits an agent running on someone's laptop — Claude Code, Codex, or anything else speaking
MCP. An agent has to act as the user, from a machine nobody here controls, and it must never
hold the user's password.

So the API runs an OAuth 2.1 authorization server. It is off unless `OPS_OAUTH_ENABLED=true`,
and when it is off none of the routes described here are registered at all.

Two repositories are involved. The authorization server and the tool surface live here, in
`packages/server/api/src/app/oauth` and `packages/server/api/src/app/mcp`. The MCP resource
server that agents actually connect to is a separate Python service, `openops-mcp`.

## Connecting an agent

The agent knows one thing to begin with: the URL of the OpenOps API. From there:

1. It reads `/.well-known/oauth-authorization-server` and learns the endpoints.
2. It registers itself at `POST /v1/oauth/register` (RFC 7591). Nobody provisions a client
   by hand — the whole point is that an agent the operator has never heard of can connect.
3. It opens `GET /v1/oauth/authorize` in the user's browser, naming the resource it wants a
   token for. The server validates the request, stores the validated parameters, and
   redirects to the consent screen under `/settings/connected-apps` carrying nothing but an
   opaque request id.
4. The user, logged in, sees who is asking and approves. The browser gets back a redirect URL
   with an authorization code in it.
5. The agent redeems the code at `POST /v1/oauth/token` with its PKCE verifier and receives
   an access token and a refresh token.

Two details in step 3 are worth calling out. The consent screen reads the client's name from
storage rather than from the query string, because the user is making a trust decision based
on that name and it must not be attacker-supplied. And the decision endpoint requires an
`x-openops-consent` header — a cross-site form post cannot set one, which keeps a third party
from driving the approval on a logged-in user's behalf.

Everything the token endpoint re-checks later — redirect URI, PKCE challenge, resource, scope
— is copied from the record written in step 3. The browser round-trip carries only the id, so
there is nothing in it to tamper with.

`resource` is not optional. It is an RFC 8707 resource indicator naming which of the two
resources the token is for, and a request without one is refused with `invalid_target`.
`scope` may be omitted, in which case it defaults to everything that resource offers;
anything asked for beyond that is refused with `invalid_scope`.

Redirect URIs must be `https`, with one exception: `http` on loopback, because a native
client has nowhere else to listen. Matching is exact, again with one loopback exception — the
port is ignored, since these clients bind an ephemeral one at request time (RFC 8252 §7.3).
Fragments and userinfo are rejected outright, the latter because the value ends up in a
`Location` header.

Every redirect back to the client carries an `iss` parameter (RFC 9207) so a client talking to
more than one authorization server can tell which answered.

## Endpoints

| Endpoint                                      | Auth   | Purpose                                         |
| --------------------------------------------- | ------ | ----------------------------------------------- |
| `GET /.well-known/oauth-authorization-server` | public | RFC 8414 metadata, also served at the OIDC path |
| `GET /v1/oauth/jwks.json`                     | public | Public keys for verifying tokens                |
| `POST /v1/oauth/register`                     | public | Dynamic client registration (RFC 7591)          |
| `GET /v1/oauth/authorize`                     | public | Start the flow; redirects to the consent screen |
| `GET /v1/oauth/requests/:id`                  | user   | What the consent screen renders                 |
| `POST /v1/oauth/requests/:id/decision`        | user   | Approve or deny                                 |
| `POST /v1/oauth/token`                        | varies | Code redemption, refresh, and token exchange    |
| `POST /v1/oauth/revoke`                       | public | Revoke a refresh token (RFC 7009)               |
| `GET /v1/oauth/grants`                        | user   | The user's connected applications               |
| `DELETE /v1/oauth/grants/:id`                 | user   | Disconnect one                                  |
| `GET /v1/mcp/openapi.json`                    | public | The tool surface for one profile                |

The token endpoint is public for the two grants a public client uses, and requires HTTP Basic
credentials for token exchange, which only the resource server may call.

## Two audiences

This is the decision that shapes most of the rest.

An agent doesn't call the API directly. It talks to an MCP resource server, which then calls
the API on its behalf. The obvious implementation is for the MCP server to forward the token
it was given. The MCP authorization spec forbids exactly that, and for a good reason: a token
the user issued to one service would become usable against another, and the resource server
becomes a place where API credentials pile up.

So there are two registered resources (`discovery/resource-registry.ts`), each with its own
audience:

| Resource | Audience               | Who holds a token for it     |
| -------- | ---------------------- | ---------------------------- |
| `mcp`    | `OPS_MCP_RESOURCE_URL` | the agent                    |
| `api`    | `OPS_OAUTH_ISSUER_URL` | the resource server, briefly |

The agent's token names the MCP server as its audience, and the API will not accept it. When
the resource server needs to make a call, it exchanges that token for an API-audience one
using RFC 8693 token exchange, authenticating with its own client credentials. The exchanged
token is short-lived — five minutes by default, capped at fifteen.

The separation only means something if the two audiences actually differ, so startup refuses
to boot when they match. That check is in `config/oauth-config-validation.ts`, and it exists
because equal audiences would quietly void the whole arrangement while everything still
appeared to work.

An API-audience token presented back at the exchange endpoint fails signature verification
against the MCP audience and is rejected as `invalid_grant`. That is what stops this server
being used to launder one token into another.

## What a token carries

Access tokens are signed JWTs (RS256) with these claims beyond the registered ones:

- `sub` — the user
- `aud` — which resource this token is for
- `client_id` — which registered client holds it
- `grant_id` — the connection it belongs to
- `project_id` — the project it may act on
- `scope`

`project_id` is signed into the token rather than looked up per request. A token can then only
ever act on the project it was minted for, and no stored state can disagree with the claim.
The trade is that the project is fixed for the life of the token — a token cannot be
redirected at another one, only replaced.

## Signing keys

Every other JWT in this system — sessions, worker tokens, engine, the built-in chat — is
HS256 under a single `OPS_JWT_SECRET`. Symmetric signing means whoever can verify can also
mint, so that secret can never be shared with a resource server, and one leak forges every
kind of principal at once.

OAuth tokens are therefore signed with their own RS256 keypair. The public half is published,
so the MCP server verifies tokens in-process rather than calling back on every request, and a
blip in the authorization server does not take MCP traffic down with it. It also splits the
blast radius in two: compromising the OAuth key forges only OAuth tokens, which are still
subject to the per-request grant check and so remain revocable, and it leaves the internal
HS256 world untouched. RS256 rather than Ed25519 purely because every client stack verifies
RS256 out of the box.

On first boot the server generates a 2048-bit keypair and stores it encrypted, so a
self-hosted install needs no key configuration. Replicas booting simultaneously race on a
partial unique index over `status = 'active'`; the loser adopts the winner's key.

An operator who would rather manage the key themselves can point
`OPS_OAUTH_SIGNING_KEY_PEM_PATH` at a PEM file. That path is validated at startup rather than
on first use — otherwise a typo or a public key in place of a private one produces a server
that looks healthy right up until the first token request.

Keys are cached for five minutes. If a reload fails and a cached copy exists, the stale copy
is served and a warning is logged: keys change only on rotation, so an old copy is almost
certainly still correct, and telling every connected agent its credential is invalid during a
brief database blip is much worse than being slightly out of date.

Public keys are published at `/v1/oauth/jwks.json`, including retiring keys, so tokens signed
before a rotation still verify.

## What is re-checked on every request

Self-contained tokens buy a lot — no database round-trip to validate a signature, no shared
session store, any replica can serve any request. What they cost is immediacy: a token stays
cryptographically valid until it expires, whatever happens in the meantime.

So every OAuth request that reaches the API re-reads the things that can change
(`projects/service-principal.ts`):

- the grant is still active
- the user still exists and is still `ACTIVE`
- the user still has access to the project in the claim

Revoking a connection therefore takes effect on the next request rather than on the next
token — with one caveat. The grant lookup is cached in-process for 60 seconds to keep it off
the hot path, so the replica that handled the revocation drops its entry at once while any
other replica can still be up to a minute behind. Deactivating a user has the same shape.

Access token TTL bounds the worst case for anything not re-read at all, which is why the
allowed range stops at one hour rather than somewhere more generous.

## Secrets at rest

No credential this server issues is stored in a form that can be replayed out of the database.
Authorization codes and refresh tokens are opaque random strings kept as SHA-256 hashes; the
client secret for the resource server is hashed the same way and compared with a timing-safe
equality; the signing key's private half is encrypted with the platform's `encryptUtils`.

Failures are deliberately indistinguishable from one another. Every way a code redemption can
fail returns the same `invalid or expired authorization code`, and every way client
authentication can fail returns the same description, so neither endpoint can be used to
enumerate what exists.

## Refresh tokens

Refresh tokens rotate on every use, per OAuth 2.1 §4.3.1. Presenting one that has already been
rotated means either a replay or a stolen token racing the real client, and from the server
there is no way to tell which — so the entire token family is revoked and the user has to
reconnect.

The ordering in `rotateRefreshToken` matters more than it might appear. Client mismatch and
expiry are judged _before_ the token is consumed, because revoking on the way in would let a
single malformed request destroy a working credential, and the client's perfectly reasonable
retry would then look like an attack. The consume itself is a conditional
`UPDATE ... WHERE revokedAt IS NULL`, so of two concurrent requests presenting the same token
exactly one wins. The same trick claims authorization codes.

One more wrinkle: when the conditional update finds nothing, the code checks whether the grant
was revoked before concluding reuse. Otherwise a user revoking their own connection would see
their next refresh reported as a compromise.

## Managing connections

Each approval creates a grant — one row per connection, which is what
`/settings/connected-apps` lists and what the `grant_id` claim points at. A user may connect
the same agent more than once; nothing is unique on client and user together, because two
laptops running the same tool are two connections.

That page is both halves of the story on purpose: the consent dialog appears over it when the
URL carries a `request_id`, so the place a user decides is the place they later review and
revoke. The dialog names no project, which is deliberate — a connection is not confined to
one, and naming where it starts would read as a limit that does not exist. Dismissing it
counts as denial, because the client is sitting on its redirect and an answer beats a timeout.
The whole page is hidden when OAuth is off, since every route behind it is unregistered.

Disconnecting marks the grant revoked and revokes every refresh token belonging to it in the
same step. Doing both matters: leaving the tokens alone would let the client keep minting
access tokens by refreshing. Other connections the same user has to the same client are left
running.

The `lastUsedAt` shown against each connection is written at most once a minute per grant, so
it is accurate to the minute rather than to the request.

`POST /v1/oauth/revoke` does the same thing from the client side, given any refresh token
belonging to the connection. Per RFC 7009 §2.2 an unknown token is not an error, so this
always returns `200` and cannot be used to test whether a token exists.

## Where the project comes from

Redeeming a code has to decide which project the connection starts in, and every request has
to confirm the user still has that project. Both go through
`projects/project-membership-factory.ts`.

The answer is simple: one project per organization, and a user reaches it through their
organization. There is no separate role model, so membership reports `ADMIN` — the same value
the browser login path reports.

The factory is there so those two questions — _what is this user's default project_ and _may
this user reach this one_ — have exactly one place they are answered. Code redemption,
refresh, token exchange and request authentication all ask it rather than resolving a project
themselves, which is what keeps four code paths from drifting apart on who may reach what.

## The tool surface

An agent's tools are generated from an OpenAPI document, one tool per operation. The API
decides what goes in that document and publishes it:

```
GET /v1/mcp/openapi.json?profile=agent
  → { "paths": { …the operations this profile exposes… },
      "x-openops-mcp": { "multiProject": true } }
```

The MCP server holds no list of its own. It fetches the document, turns every operation into
a tool, and knows nothing about what any particular install exposes — which is the point,
since the API is the only party that knows what routes it registered.

Profiles are named after their consumer:

| Profile | Consumer               | Transport                       |
| ------- | ---------------------- | ------------------------------- |
| `chat`  | the built-in AI chat   | stdio, spawned per chat request |
| `agent` | external OAuth clients | http                            |

Both are served the same read-only surface here — reading flows, runs, blocks and app
connections — so the two names describe who is asking rather than what they get.

The document also carries `x-openops-mcp: { multiProject: false }`, which is what tells the
MCP server that no tool on this surface takes a project argument.

Tool names come from each operation's `operationId` and descriptions from its `description`,
both of which live in the route definitions here. Renaming a tool an agent calls means editing
a route, and asking for a profile the API does not publish stops the MCP server at startup
rather than quietly producing half a tool list.

A profile decides what an external agent may reach, so its contents are a security boundary
and are pinned in tests rather than trusted to review.

## Running it locally

OAuth is off by default and every route 404s until it is on. Postgres is required — the
migration is registered for Postgres only, and the boot refuses SQLite rather than failing on
the first request.

```bash
docker compose up -d --wait

export $(grep -v '^#' .env | xargs)                 # your usual local settings
export PATH="$PWD/node_modules/.bin:$PATH"          # the block rebuild step needs nx

export OPS_OAUTH_ENABLED=true
export OPS_OAUTH_ISSUER_URL=http://localhost:3000   # public base URL of this API
export OPS_MCP_RESOURCE_URL=http://localhost:3020/mcp
export OPS_OAUTH_RS_CLIENT_SECRET=$(openssl rand -hex 32)

npx nx build server-api && node dist/packages/server/api/main.js
```

First boot generates the signing keypair and logs `OAuth authorization server enabled`.
Nothing else is needed. A quick check from another shell:

```bash
curl -s localhost:3000/.well-known/oauth-authorization-server | jq
curl -s localhost:3000/v1/oauth/jwks.json | jq '.keys[0] | {kty, alg, kid}'
```

The protocol chain — registration through consent, redemption, exchange, and a call the API
accepts — runs as a test, so there is nothing to drive by hand:

```bash
npx jest -c packages/server/api/jest.config.ts --testPathPattern=oauth-end-to-end
```

What a test cannot exercise is a real client and the consent screen a person reads. For that
you need the frontend up (`npx nx serve react-ui`) with `OPS_FRONTEND_URL` pointing at it,
and the MCP server from its own repository:

```bash
cd ../openops-mcp
MCP_TRANSPORT=http \
OPENOPS_API_URL=http://localhost:3000 \
OPENOPS_MCP_PROFILE=agent \
OPENOPS_MCP_ISSUER=http://localhost:3000 \
OPENOPS_MCP_RESOURCE_URL=http://localhost:3020/mcp \
OPENOPS_MCP_CLIENT_SECRET="$OPS_OAUTH_RS_CLIENT_SECRET" \
uv run openops-mcp
```

Then point a client at it:

```bash
claude mcp add --transport http openops http://localhost:3020/mcp
```

The client discovers the authorization server, registers, and opens the browser at Settings →
Connected apps with the consent dialog over it. Approving sends it back to its callback, which
redeems the code and lists the tools. Things worth confirming while you are there: cancelling
returns `error=access_denied` to the client, reloading after deciding shows the expired-request
message rather than a second dialog, and connecting twice produces two independently revocable
rows.

Inspecting and resetting state:

```bash
docker exec postgres psql -U postgres -d openops -c \
  "SELECT id, \"clientId\", status, \"lastUsedAt\" FROM oauth_grant ORDER BY created DESC;"

docker exec redis redis-cli zrange "bull:system-job-queue:repeat" 0 -1 | grep oauth

docker exec postgres psql -U postgres -d openops -c \
  "DROP TABLE IF EXISTS oauth_refresh_token, oauth_authorization_code,
     oauth_pending_authorization, oauth_grant, oauth_client, oauth_signing_key CASCADE;
   DELETE FROM migrations WHERE name = 'CreateOAuthTables1786355547856';"
```

The migration re-runs on the next boot and a fresh key is generated.

## Deploying it

The API and the MCP server run as separate pods in one cluster, with everything public on 443
and `/api` routed to the API. The MCP server talks to two different places and it matters
which is which:

```
OPENOPS_API_URL          = http://openops-api:3000   # pod-to-pod: every tool call
OPENOPS_MCP_ISSUER       = https://<host>/api        # public: iss check and discovery
OPENOPS_MCP_RESOURCE_URL = https://<host>/mcp        # public: the token audience
```

The issuer has to stay public even though the API is reachable internally. It is minted into
the `iss` claim and verified by exact string match, and the same value is advertised to
clients as the authorization server they should talk to. Only low-volume auth traffic
hairpins through the ingress — one exchange per agent and project every few minutes, plus a
rarely refreshed JWKS fetch. Tool calls stay inside the cluster.

Two things will break it if missed. The ingress must not rewrite the `/mcp` path: the MCP
server derives its own resource identifier from the mount path, and a stripped prefix makes
the advertised resource and the actual audience disagree. And `OPS_MCP_RESOURCE_URL` here must
equal `OPENOPS_MCP_RESOURCE_URL` there, exactly. Sharing a host is fine, since audiences are
compared with their path — `/api` and `/mcp` are distinct.

## Cleanup

An hourly system job (`oauth-cleanup-job.ts`) deletes expired authorization codes and pending
authorizations, expired refresh tokens, registered clients older than 30 days that no user ever
connected, and grants idle for 30 days with no live refresh token left.

Two notes. Revoked refresh tokens are kept until their natural expiry rather than deleted on
revocation — reuse detection needs the row to recognise a replay as a compromise instead of
reporting a generic `invalid refresh token`. And the handler is registered even when OAuth is
disabled, because the schedule lives in Redis and outlives the process; an install that turned
OAuth off would otherwise log a missing-handler error every hour forever.

## Configuration

| Variable                               | Default | Notes                                                   |
| -------------------------------------- | ------- | ------------------------------------------------------- |
| `OPS_OAUTH_ENABLED`                    | `false` | Nothing is registered when false                        |
| `OPS_OAUTH_ISSUER_URL`                 | —       | Public URL of the API; also the `api` audience          |
| `OPS_MCP_RESOURCE_URL`                 | unset   | Enables the `mcp` resource; must differ from the issuer |
| `OPS_OAUTH_RS_CLIENT_SECRET`           | unset   | Resource server credential, 32 characters minimum       |
| `OPS_OAUTH_ACCESS_TOKEN_TTL_SECONDS`   | `900`   | 60–3600                                                 |
| `OPS_OAUTH_EXCHANGE_TOKEN_TTL_SECONDS` | `300`   | 60–900                                                  |
| `OPS_OAUTH_REFRESH_TOKEN_TTL_DAYS`     | `30`    | 1–90                                                    |
| `OPS_OAUTH_SIGNING_KEY_PEM_PATH`       | unset   | Bring your own key instead of generating one            |

Both URLs must use `https` unless they point at loopback, and neither may carry a query string
or fragment.

Some limits are not operator-tunable, because getting them wrong has no upside:

|                                        |                |
| -------------------------------------- | -------------- |
| Authorization code lifetime            | 60 seconds     |
| Pending authorization lifetime         | 10 minutes     |
| Registration rate limit                | 10 per minute  |
| Token, authorize and revoke rate limit | 120 per minute |
| Signing key cache                      | 5 minutes      |
| Unused client retention                | 30 days        |
| Idle grant retention                   | 30 days        |

The token rate limit sits well above normal use because refreshing is routine background work
for a connected agent, while still bounding how fast a stolen code or token can be guessed at.

Configuration is validated before any route is served. A value that is merely wrong rather
than malformed is the dangerous case — it produces a server that looks healthy while a
guarantee is quietly gone — so those checks fail the boot.

## Things this deliberately doesn't do

**No OpenID Connect.** The metadata document is served at the OIDC discovery path because MCP
clients look there, but no id tokens are issued and no OIDC claims are advertised. Claiming
support would mislead clients that branch on those fields.

**No confidential clients through registration.** Anyone who can reach the API can register,
so registered clients are public clients restricted to `authorization_code` and
`refresh_token`, and PKCE is mandatory (S256 only). The only confidential client is the
resource server, created from configuration at boot rather than over the network.

**No introspection endpoint.** Tokens are self-contained and verifiable from the JWKS.

**Postgres only.** The migration is registered for Postgres, so startup refuses SQLite rather
than failing on the first request against tables that were never created.

Deferred rather than rejected: fine-grained scopes with incremental consent, DPoP
sender-constrained tokens, an Ed25519 signing option, RFC 7592 client management, and a
user-supplied label per connection — connections are currently told apart by client name,
creation time and last use, which is thin when someone connects the same agent from two
machines.

## Known gaps

`extractClientRealIp` returns its header with no fallback, and the rate limiter uses that key
verbatim, so any pod-to-pod caller of a rate-limited route shares one bucket keyed `undefined`.
The deployment above hairpins the exchange through the ingress, which populates the header, so
this does not currently bite. It is still worth fixing on its own merits.

Two different token shapes both map to `PrincipalType.SERVICE`: the HS256 session-secret token
the built-in chat uses, and the RS256 `aud=api` OAuth token. Route policies cannot tell them
apart, so allowing SERVICE on a route admits both callers.

## Tests

`packages/server/api/test/integration/ce/oauth/` holds three suites:

- `oauth-routes.test.ts` — discovery, request validation, consent, and the error responses
- `oauth-consumption.test.ts` — replay, concurrent redemption, expiry, rotation and reuse
  detection, revocation cascade, cleanup
- `oauth-end-to-end.test.ts` — one unknown client walked from registration to a token the API
  actually accepts, plus the three refusals that matter most: an API-audience token offered
  back to the exchange, a project the user does not belong to, and a resource server that
  cannot prove who it is

`test/unit/oauth/projects/` covers the project lookup and the principal built from a token,
and `test/unit/mcp/` covers the document served for each profile.

The end-to-end suite exists because the other two verify each step in isolation and neither
shows the steps fitting together. A renamed claim, a mismatched audience, or a grant the
exchange cannot resolve would pass every unit test and break every agent.
