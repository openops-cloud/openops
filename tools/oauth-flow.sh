#!/bin/bash
#
# Walks the external-agent OAuth flow end to end against a locally running API.
# See docs/oauth-manual-testing.md.
#
# Usage:
#   tools/oauth-flow.sh              # api resource (direct REST access, like a CLI)
#   tools/oauth-flow.sh mcp          # mcp resource (adds the token-exchange step)
#
set -euo pipefail

RESOURCE_KIND="${1:-api}"
API="${OPS_OAUTH_TEST_API:-http://localhost:3000}"
EMAIL="${OPS_OAUTH_TEST_EMAIL:-local-admin@openops.com}"
PASSWORD="${OPS_OAUTH_TEST_PASSWORD:-12345678}"
MCP_RESOURCE="${OPS_MCP_RESOURCE_URL:-http://localhost:3020/mcp}"
RS_SECRET="${OPS_OAUTH_RS_CLIENT_SECRET:-}"
REDIRECT="http://127.0.0.1:41100/callback"

# A fixed PKCE pair. Real clients generate one per request; a constant keeps this
# script readable and is not a weakness here because nothing is at stake locally.
VERIFIER="dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
CHALLENGE="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\033[31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

claims() {
  python3 -c "
import base64, json, sys
payload = sys.argv[1].split('.')[1]
payload += '=' * (-len(payload) % 4)
decoded = json.loads(base64.urlsafe_b64decode(payload))
shown = {k: decoded[k] for k in ('aud','sub','scope','grant_id','project_id') if k in decoded}
print(json.dumps(shown, indent=2))" "$1"
}

json_get() { python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])" "$1" "$2"; }

# ---------------------------------------------------------------- preflight ---
say "Preflight"
curl -sf -o /dev/null "$API/v1/flags" || fail "API not reachable at $API"
if ! curl -sf -o /dev/null "$API/.well-known/oauth-authorization-server"; then
  fail "OAuth is disabled. Start the API with OPS_OAUTH_ENABLED=true (see docs/oauth-manual-testing.md)"
fi
echo "  API up, OAuth enabled"

if [ "$RESOURCE_KIND" = "mcp" ]; then
  RESOURCE="$MCP_RESOURCE"
  [ -n "$RS_SECRET" ] || fail "mcp mode needs OPS_OAUTH_RS_CLIENT_SECRET (same value the API was started with)"
  curl -s "$API/.well-known/oauth-authorization-server" |
    grep -q '"mcp"' || fail "the API has no mcp resource configured (set OPS_MCP_RESOURCE_URL)"
else
  RESOURCE="$(curl -s "$API/.well-known/oauth-authorization-server" |
    python3 -c "import sys,json;print(json.load(sys.stdin)['issuer'])")"
fi
echo "  resource: $RESOURCE"

# --------------------------------------------------------------- discovery ---
say "1. Discovery (what a client reads first)"
curl -s "$API/.well-known/oauth-authorization-server" | python3 -m json.tool | head -14
echo "  jwks keys: $(curl -s "$API/v1/oauth/jwks.json" |
  python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['keys']), d['keys'][0]['alg'])")"

# ------------------------------------------------------------ registration ---
say "2. Dynamic client registration"
curl -s -X POST "$API/v1/oauth/register" -H 'Content-Type: application/json' \
  -d "{\"client_name\":\"Manual Test Client\",\"redirect_uris\":[\"$REDIRECT\"]}" \
  -o "$WORK_DIR/client.json"
CLIENT_ID="$(json_get "$WORK_DIR/client.json" client_id)"
echo "  client_id: $CLIENT_ID"

# --------------------------------------------------------------- authorize ---
say "3. Authorize (a real client opens this in a browser)"
AUTHORIZE_URL="$API/v1/oauth/authorize?client_id=$CLIENT_ID&redirect_uri=$(
  python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$REDIRECT"
)&response_type=code&code_challenge=$CHALLENGE&code_challenge_method=S256&resource=$(
  python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$RESOURCE"
)&state=manual-test-state"
LOCATION="$(curl -s -i "$AUTHORIZE_URL" | grep -i '^location:' | tr -d '\r' | sed 's/^[Ll]ocation: //')"
echo "  browser would be sent to: $LOCATION"
REQUEST_ID="$(printf '%s' "$LOCATION" | sed -n 's/.*request_id=\([^&]*\).*/\1/p')"
[ -n "$REQUEST_ID" ] || fail "no request_id in the redirect — check the authorize parameters"

# ------------------------------------------------------------------ consent ---
say "4. Consent (the UI does this; there is no consent page yet, so we drive it directly)"
curl -s -c "$WORK_DIR/cookies" -X POST "$API/v1/authentication/sign-in" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" -o /dev/null ||
  fail "sign-in failed for $EMAIL"

echo "  what the consent screen would show:"
curl -s -b "$WORK_DIR/cookies" "$API/v1/oauth/requests/$REQUEST_ID" | python3 -m json.tool | sed 's/^/    /'

curl -s -b "$WORK_DIR/cookies" -X POST "$API/v1/oauth/requests/$REQUEST_ID/decision" \
  -H 'Content-Type: application/json' -H 'x-openops-consent: 1' \
  -d '{"approve":true}' -o "$WORK_DIR/decision.json"
CODE="$(python3 -c "
import json, urllib.parse as u
q = u.parse_qs(u.urlparse(json.load(open('$WORK_DIR/decision.json'))['redirectTo']).query)
print(q['code'][0])")"
echo "  approved; code issued (state and iss are echoed back to the client)"

# -------------------------------------------------------------------- token ---
say "5. Redeem the code"
curl -s -X POST "$API/v1/oauth/token" \
  -d "grant_type=authorization_code&code=$CODE&client_id=$CLIENT_ID&redirect_uri=$REDIRECT&code_verifier=$VERIFIER&resource=$RESOURCE" \
  -o "$WORK_DIR/tokens.json"
grep -q access_token "$WORK_DIR/tokens.json" || fail "$(cat "$WORK_DIR/tokens.json")"
ACCESS_TOKEN="$(json_get "$WORK_DIR/tokens.json" access_token)"
REFRESH_TOKEN="$(json_get "$WORK_DIR/tokens.json" refresh_token)"
echo "  claims in the client's token:"
claims "$ACCESS_TOKEN" | sed 's/^/    /'

# ------------------------------------------------------- use it on the API ---
if [ "$RESOURCE_KIND" = "mcp" ]; then
  say "6. Token exchange (what the MCP resource server does per tool call)"
  BASIC="$(printf 'openops-mcp-rs:%s' "$RS_SECRET" | base64 | tr -d '\n')"
  echo "  the client's own token must NOT work against the API:"
  echo "    HTTP $(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $ACCESS_TOKEN" "$API/v1/flows") (expect 401)"
  curl -s -X POST "$API/v1/oauth/token" -H "Authorization: Basic $BASIC" \
    -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange&subject_token=$ACCESS_TOKEN" \
    -o "$WORK_DIR/exchange.json"
  grep -q access_token "$WORK_DIR/exchange.json" || fail "$(cat "$WORK_DIR/exchange.json")"
  API_TOKEN="$(json_get "$WORK_DIR/exchange.json" access_token)"
  echo "  exchanged for a separate API-audience token:"
  claims "$API_TOKEN" | sed 's/^/    /'
else
  API_TOKEN="$ACCESS_TOKEN"
fi

say "7. Call the API with it"
PROJECT_ID="$(python3 -c "
import base64, json
p = '$API_TOKEN'.split('.')[1]; p += '=' * (-len(p) % 4)
print(json.loads(base64.urlsafe_b64decode(p))['project_id'])")"
STATUS="$(curl -s -o "$WORK_DIR/flows.json" -w '%{http_code}' \
  -H "Authorization: Bearer $API_TOKEN" "$API/v1/flows?projectId=$PROJECT_ID")"
echo "  GET /v1/flows -> HTTP $STATUS"
[ "$STATUS" = "200" ] || fail "the token was refused by the API"

# ------------------------------------------------------------------ refresh ---
say "8. Refresh, and confirm the old token is single-use"
curl -s -X POST "$API/v1/oauth/token" \
  -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN&client_id=$CLIENT_ID" \
  -o "$WORK_DIR/rotated.json"
grep -q access_token "$WORK_DIR/rotated.json" || fail "$(cat "$WORK_DIR/rotated.json")"
ROTATED_REFRESH="$(json_get "$WORK_DIR/rotated.json" refresh_token)"
echo "  rotated; new refresh token issued"
echo "  replaying the old one: $(curl -s -X POST "$API/v1/oauth/token" \
  -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN&client_id=$CLIENT_ID" |
  python3 -c "import sys,json;print(json.load(sys.stdin)['error_description'])")"
echo "  (that also kills the rotated token — a replay means the chain is untrusted)"

# ----------------------------------------------------- connections + revoke ---
say "9. Connected apps, and revoking one"
curl -s -b "$WORK_DIR/cookies" "$API/v1/oauth/grants" | python3 -c "
import sys, json
for g in json.load(sys.stdin)['data']:
    print(f\"    {g['clientName']}  grant={g['id']}  project={g['projectId']}  last used={g['lastUsedAt']}\")"

GRANT_ID="$(python3 -c "
import base64, json
p = '$API_TOKEN'.split('.')[1]; p += '=' * (-len(p) % 4)
print(json.loads(base64.urlsafe_b64decode(p))['grant_id'])")"
curl -s -b "$WORK_DIR/cookies" -X DELETE "$API/v1/oauth/grants/$GRANT_ID" -o /dev/null
echo "  revoked grant $GRANT_ID"
echo "  API call with its still-unexpired token: HTTP $(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $API_TOKEN" "$API/v1/flows?projectId=$PROJECT_ID") (expect 401)"
echo "  refresh after revocation: $(curl -s -X POST "$API/v1/oauth/token" \
  -d "grant_type=refresh_token&refresh_token=$ROTATED_REFRESH&client_id=$CLIENT_ID" |
  python3 -c "import sys,json;print(json.load(sys.stdin)['error_description'])")"

say "Done — full flow verified for the '$RESOURCE_KIND' resource."
