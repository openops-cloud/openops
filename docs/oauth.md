# OAuth for external agents

OpenOps authenticates people through the browser and workflows through the engine. Neither
fits an agent running on someone's laptop — Claude Code, Codex, or anything else speaking
MCP. An agent has to act as the user, from a machine nobody here controls, and it must never
hold the user's password.

So the API runs a small OAuth 2.1 authorization server. It is off unless
`OPS_OAUTH_ENABLED=true`, and when it is off none of the routes described here are
registered at all.

Everything below lives in `packages/server/api/src/app/oauth`.

## Connecting an agent

The agent knows one thing to begin with: the URL of the OpenOps API. From there:

1. It reads `/.well-known/oauth-authorization-server` and learns the endpoints.
2. It registers itself at `POST /v1/oauth/register` (RFC 7591). Nobody provisions a client
   by hand — the whole point is that an agent the operator has never heard of can connect.
3. It opens `GET /v1/oauth/authorize` in the user's browser. The server validates the
   request, stores the validated parameters, and redirects to the consent screen under
   `/settings/connected-apps` carrying nothing but an opaque request id.
4. The user, logged in, sees who is asking and approves. The browser gets back a redirect
   URL with an authorization code in it.
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

`project_id` is signed into the token rather than looked up per request. A token can then
only ever act on the project it was minted for, and there is no second source of truth to
disagree with the claim. The cost is that changing project means getting a new token, which
is deliberate.

## What is re-checked, and why it has to be

Self-contained tokens buy a lot — no database round-trip to validate a signature, no shared
session store, any replica can serve any request. What they cost is immediacy: a token stays
cryptographically valid until it expires, whatever happens in the meantime.

So every OAuth request that reaches the API re-reads the things that can change
(`projects/service-principal.ts`):

- the grant is still active
- the user still exists and is still `ACTIVE`
- the user still has access to the project in the claim

Revoking a connection therefore takes effect on the next request, not on the next token.
Access token TTL still bounds the worst case for anything not on that list, which is why the
allowed range is 60 seconds to one hour rather than something more generous.

## Secrets at rest

No credential this server issues is stored in a form that can be replayed out of the
database. Authorization codes and refresh tokens are opaque random strings kept as SHA-256
hashes; the client secret for the resource server is hashed the same way and compared with a
timing-safe equality; the signing key's private half is encrypted with the platform's
`encryptUtils`.

Failures are deliberately indistinguishable from one another. Every way a code redemption can
fail returns the same `invalid or expired authorization code`, and every way client
authentication can fail returns the same description, so neither endpoint can be used to
enumerate what exists.

## Refresh tokens

Refresh tokens rotate on every use, per OAuth 2.1 §4.3.1. Presenting one that has already
been rotated means either a replay or a stolen token racing the real client, and from the
server there is no way to tell which — so the entire token family is revoked and the user has
to reconnect.

The ordering in `rotateRefreshToken` matters more than it looks. Client mismatch and expiry
are judged _before_ the token is consumed, because revoking on the way in would let a single
malformed request destroy a working credential, and the client's perfectly reasonable retry
would then look like an attack. The consume itself is a conditional `UPDATE ... WHERE
revokedAt IS NULL`, so of two concurrent requests presenting the same token exactly one wins.
The same trick claims authorization codes.

One more wrinkle: when the conditional update finds nothing, the code checks whether the
grant was revoked before concluding reuse. Otherwise a user revoking their own connection
would see their next refresh reported as a compromise.

## Signing keys

On first boot the server generates a 2048-bit RSA keypair and stores it encrypted, so a
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

## Where the project comes from

Redeeming a code has to decide which project the connection starts in, and every request has
to confirm the user still has that project. Both go through
`projects/project-membership-factory.ts`.

In this edition the answer is simple: one project per organization, and a user reaches it
through their organization. There is no role model here, so membership reports `ADMIN`, which
is what the browser login path reports too.

It sits behind a factory rather than being called directly so that an edition with a real
multi-project membership model can answer the same two questions — _what is this user's
default project_ and _may this user reach this one_ — without any of the OAuth code changing.

## Cleanup

An hourly system job (`oauth-cleanup-job.ts`) deletes expired authorization codes and pending
authorizations, expired refresh tokens, registered clients older than 30 days that no user
ever connected, and grants idle for 30 days with no live refresh token left.

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

Both URLs must use `https` unless they point at loopback, and neither may carry a query
string or fragment.

Configuration is validated before any route is served. A value that is merely wrong rather
than malformed is the dangerous case — it produces a server that looks healthy while a
guarantee is quietly gone — so those checks fail the boot.

## Things this deliberately doesn't do

**No OpenID Connect.** The metadata document is served at the OIDC discovery path because MCP
clients look there, but no id tokens are issued and no OIDC claims are advertised. Claiming
support would mislead clients that branch on those fields.

**No confidential clients through registration.** Anyone who can reach the API can register,
so registered clients are public clients restricted to `authorization_code` and
`refresh_token`, and PKCE is mandatory (S256 only). The only confidential client is the resource server,
created from configuration at boot rather than over the network.

**No introspection endpoint.** Tokens are self-contained and verifiable from the JWKS.

**Postgres only.** The migration is registered for Postgres, so startup refuses SQLite rather
than failing on the first request against tables that were never created.

## Tests

`packages/server/api/test/integration/ce/oauth/` holds three suites:

- `oauth-routes.test.ts` — discovery, request validation, consent, and the error responses
- `oauth-consumption.test.ts` — replay, concurrent redemption, expiry, rotation and reuse
  detection, revocation cascade, cleanup
- `oauth-end-to-end.test.ts` — one unknown client walked from registration to a token the API
  actually accepts, plus the three refusals that matter most: an API-audience token offered
  back to the exchange, a project the user does not belong to, and a resource server that
  cannot prove who it is

The end-to-end suite exists because the other two verify each step in isolation and neither
shows the steps fitting together. A renamed claim, a mismatched audience, or a grant the
exchange cannot resolve would pass every unit test and break every agent.
