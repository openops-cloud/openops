// `URL.hostname` keeps the brackets for IPv6 literals.
const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', '[::1]', 'localhost']);
const MAX_URI_LENGTH = 512;

function parseUri(uri: string): URL | undefined {
  try {
    return new URL(uri);
  } catch {
    return undefined;
  }
}

function isLoopback(url: URL): boolean {
  return url.protocol === 'http:' && LOOPBACK_HOSTNAMES.has(url.hostname);
}

/**
 * Shape rules a redirect URI must satisfy to be used at all, whether it arrives
 * at registration or on an authorize request.
 *
 * Only https and, per RFC 8252 §7.3, http loopback for native clients. Fragments
 * are forbidden by RFC 6749 §3.1.2. Userinfo is rejected because the server
 * echoes this value back in a `Location` header, and credentials embedded in that
 * URL would be attacker-supplied content the user is redirected through. The
 * length cap keeps a presented value inside its storage column.
 */
function isUsableRedirectUri(uri: string): boolean {
  if (
    typeof uri !== 'string' ||
    uri.length === 0 ||
    uri.length > MAX_URI_LENGTH
  ) {
    return false;
  }

  const url = parseUri(uri);
  if (!url || url.hash !== '' || url.username !== '' || url.password !== '') {
    return false;
  }

  return url.protocol === 'https:' || isLoopback(url);
}

export function isRegistrableRedirectUri(uri: string): boolean {
  return isUsableRedirectUri(uri);
}

/**
 * Exact string matching, except loopback redirects match on any port because
 * native clients bind an ephemeral port at request time (RFC 8252 §7.3).
 */
export function matchesRegisteredRedirectUri(
  registeredUris: string[],
  presentedUri: string,
): boolean {
  // Held to the same shape rules as a registered value. Loopback matching ignores
  // the port, so without this a presented URI could carry a fragment, userinfo or
  // an unbounded length past the checks that registration applied.
  if (!isUsableRedirectUri(presentedUri)) {
    return false;
  }

  const presented = parseUri(presentedUri);
  if (!presented) {
    return false;
  }

  return registeredUris.some((registeredUri) => {
    if (registeredUri === presentedUri) {
      return true;
    }

    const registered = parseUri(registeredUri);
    if (!registered || !isLoopback(registered) || !isLoopback(presented)) {
      return false;
    }

    return (
      registered.hostname === presented.hostname &&
      registered.pathname === presented.pathname &&
      registered.search === presented.search
    );
  });
}
