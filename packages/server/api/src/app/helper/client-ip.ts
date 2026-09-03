const IPV4_WITH_PORT = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/;
const BRACKETED_IPV6 = /^\[(.+)\](?::\d+)?$/;

/**
 * Returns the client IP without the port.
 *
 * With `trustProxy` enabled, the address is taken from the `X-Forwarded-For`
 * header, and some proxies append the source port (`1.2.3.4:56789`), which
 * breaks consumers that expect a bare IP address.
 */
export function normalizeClientIp(ip: string | undefined): string | undefined {
  if (!ip) {
    return undefined;
  }

  const trimmed = ip.trim();

  const bracketedIpv6 = BRACKETED_IPV6.exec(trimmed);
  if (bracketedIpv6) {
    return bracketedIpv6[1];
  }

  const ipv4WithPort = IPV4_WITH_PORT.exec(trimmed);
  if (ipv4WithPort) {
    return ipv4WithPort[1];
  }

  return trimmed === '' ? undefined : trimmed;
}
