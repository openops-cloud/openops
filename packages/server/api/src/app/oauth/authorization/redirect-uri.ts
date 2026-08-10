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
 * https only, plus http loopback for native clients (RFC 8252 §7.3). Fragments are
 * forbidden by RFC 6749 §3.1.2; userinfo is rejected because this value is echoed into a
 * `Location` header; the length cap keeps it inside its storage column.
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
  // Re-checked: loopback matching ignores the port, so a presented URI could otherwise
  // carry a fragment, userinfo or unbounded length past the registration checks.
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
