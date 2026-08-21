# Testing external-agent OAuth locally

How to exercise the OAuth 2.1 authorization server by hand. Design:
`docs/oauth-design.md` (OPS-4673).

The whole chain works end to end: an MCP client discovers the server, registers,
opens the browser at the consent screen, and receives a token. Two ways to test it
— [by hand with the script](#walk-the-whole-flow), which needs no browser, or
[with a real client](#connect-a-real-client), which is what users will do.

The MCP resource server lives in its own repository, `openops-mcp`.

## Start the API with OAuth on

OAuth is off by default and every route 404s until it is enabled. Postgres is
required — the migration is registered for Postgres only.

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

First boot generates the RS256 signing keypair and logs
`OAuth authorization server enabled`. Nothing else is needed: the keypair is
created automatically and stored encrypted.

Sanity check, in another shell:

```bash
curl -s localhost:3000/.well-known/oauth-authorization-server | jq
curl -s localhost:3000/v1/oauth/jwks.json | jq '.keys[0] | {kty, alg, kid}'
```

## Walk the whole flow

```bash
tools/oauth-flow.sh          # api resource — a CLI or partner agent calling REST directly
tools/oauth-flow.sh mcp      # mcp resource — adds the token-exchange step
```

Pass `OPS_OAUTH_RS_CLIENT_SECRET` with the same value the API was started with;
the `mcp` mode authenticates as the resource server. The script registers a
client, authorizes, approves consent, redeems the code, calls the API, rotates
the refresh token, and revokes the connection — printing the token claims at each
step so you can see what a client actually receives.

The two modes differ in one way that matters: with `mcp`, the client's own token
is **refused** by the API (401) and has to be exchanged for a separate
API-audience token first. That is the no-token-passthrough rule, and the script
asserts it.

## Connect a real client

This is the path a user takes, and the only one that exercises the consent screen.
You need the frontend running (`npx nx serve react-ui`, port 4200) as well as the
API, and `OPS_FRONTEND_URL` pointing at it — that is what the authorize endpoint
redirects the browser to.

Start the MCP resource server from the `openops-mcp` repository:

```bash
cd ../openops-mcp
MCP_TRANSPORT=http \
OPENOPS_API_URL=http://localhost:3000 \
OPENOPS_MCP_ROUTES=config/routes.oss.yaml \
OPENOPS_MCP_ISSUER=http://localhost:3000 \
OPENOPS_MCP_RESOURCE_URL=http://localhost:3020/mcp \
OPENOPS_MCP_CLIENT_SECRET="$OPS_OAUTH_RS_CLIENT_SECRET" \
uv run openops-mcp
```

Then point a client at it. With Claude Code:

```bash
claude mcp add --transport http openops http://localhost:3020/mcp
```

The client discovers the authorization server, registers itself, and opens your
browser at **Settings → Connected apps**, with the consent dialog over it. Sign in
if you are not already. Approving sends the browser back to the client, which
redeems the code and lists the tools.

Worth confirming while you are here:

- **The project is named in the dialog**, and it matches `project_id` in the
  issued token — that claim is what every later request is authorized against.
- **Cancelling** returns the client to its callback with `error=access_denied`.
  So does dismissing the dialog: the client is waiting on its redirect, and
  telling it no beats leaving it to time out.
- **Reloading the page** after deciding shows the expired-request message rather
  than a second consent dialog. The pending record is single-use.
- **Connecting a second client** (or the same one again) produces an independent
  connection. Both appear as separate rows on that page, and disconnecting one
  leaves the other working — which is the point of the per-connection model.
- **The page is hidden** when `OPS_OAUTH_ENABLED` is false, because every route it
  depends on is unregistered.

## Switching project

A connection acts wherever the user can, not only where it started. With a token in
hand:

```bash
# Where may this connection go, and where is it now?
curl -s localhost:3000/v1/oauth/projects -H "Authorization: Bearer $TOKEN" | jq

# Move a direct API client.
curl -s -X POST localhost:3000/v1/oauth/token \
  -d "grant_type=refresh_token&refresh_token=$REFRESH&client_id=$CID&project_id=$OTHER" | jq

# Move a resource server on an agent's behalf — the Claude Code path.
curl -s -X POST localhost:3000/v1/oauth/token \
  -u "openops-mcp-rs:$OPS_OAUTH_RS_CLIENT_SECRET" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange&subject_token=$MCP_TOKEN&project_id=$OTHER" | jq
```

Naming a project the user is not a member of returns `invalid_target`, and on the
refresh path the refusal happens before the token is consumed — so a wrong guess does
not cost a working connection. Decode `project_id` from the returned access token to
confirm the move.

This edition has one project per organization, so there is usually nowhere else to go.
To exercise it, add a second project to the same organization — note that
`tablesDatabaseToken` must be a genuinely encrypted value, since the API decrypts it at
boot and will refuse to start on a malformed one.

## Things worth poking at by hand

Each of these should produce a clean OAuth error, never a 500:

```bash
CID=$(curl -s -X POST localhost:3000/v1/oauth/register -H 'Content-Type: application/json' \
  -d '{"client_name":"Probe","redirect_uris":["http://127.0.0.1:41100/callback"]}' | jq -r .client_id)
AUTH="localhost:3000/v1/oauth/authorize?client_id=$CID&redirect_uri=http%3A%2F%2F127.0.0.1%3A41100%2Fcallback&response_type=code&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256&resource=http%3A%2F%2Flocalhost%3A3020%2Fmcp"

# Unregistered redirect_uri: renders an error, must NOT redirect (open-redirect boundary)
curl -si "localhost:3000/v1/oauth/authorize?client_id=$CID&redirect_uri=https%3A%2F%2Fattacker.example%2Fsteal&response_type=code&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256&resource=http%3A%2F%2Flocalhost%3A3020%2Fmcp" | head -1

# Missing PKCE: redirects back to the *registered* uri with error + state + iss
curl -si "localhost:3000/v1/oauth/authorize?client_id=$CID&redirect_uri=http%3A%2F%2F127.0.0.1%3A41100%2Fcallback&response_type=code&resource=http%3A%2F%2Flocalhost%3A3020%2Fmcp&state=s" | grep -i location

# Registration refuses non-loopback http and consent-skipping grants
curl -s -X POST localhost:3000/v1/oauth/register -H 'Content-Type: application/json' \
  -d '{"client_name":"E","redirect_uris":["http://evil.example/cb"]}' | jq
curl -s -X POST localhost:3000/v1/oauth/register -H 'Content-Type: application/json' \
  -d '{"client_name":"E","redirect_uris":["https://a.example/cb"],"grant_types":["implicit"]}' | jq

# Consent decision without the anti-CSRF header. Needs a session first — without
# one you get `missing access token`, because the route requires a logged-in user
# before it looks at anything else.
curl -s -c /tmp/ck -X POST localhost:3000/v1/authentication/sign-in \
  -H 'Content-Type: application/json' \
  -d '{"email":"local-admin@openops.com","password":"12345678"}' -o /dev/null
curl -s -b /tmp/ck -X POST "localhost:3000/v1/oauth/requests/anything/decision" \
  -H 'Content-Type: application/json' -d '{"approve":true}' | jq
# -> invalid_request: the x-openops-consent header is required
```

To check that **connections are independent**, run `tools/oauth-flow.sh` twice
without revoking in between, then look at Settings → Connected apps (or
`GET /v1/oauth/grants`): two rows for the same client, each revocable on its own.

## Inspecting state

```bash
docker exec postgres psql -U postgres -d openops -c \
  "SELECT id, \"clientId\", \"projectId\", status, \"lastUsedAt\" FROM oauth_grant ORDER BY created DESC;"

docker exec postgres psql -U postgres -d openops -c \
  "SELECT \"grantId\", \"familyId\", \"revokedAt\" IS NOT NULL AS revoked FROM oauth_refresh_token ORDER BY created DESC;"
```

The hourly cleanup job is registered at boot. Confirm it is scheduled with:

```bash
docker exec redis redis-cli zrange "bull:system-job-queue:repeat" 0 -1 | grep oauth
```

## Resetting between runs

```bash
docker exec postgres psql -U postgres -d openops -c \
  "DROP TABLE IF EXISTS oauth_refresh_token, oauth_authorization_code,
     oauth_pending_authorization, oauth_grant, oauth_client, oauth_signing_key CASCADE;
   DELETE FROM migrations WHERE name = 'CreateOAuthTables1785312000000';"
```

The migration re-runs on the next boot and a fresh signing key is generated.
