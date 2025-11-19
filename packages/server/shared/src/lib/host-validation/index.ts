import { promises as dns } from 'dns';
import ipRangeCheck from 'ip-range-check';
import { isIPv4, isIPv6 } from 'net';
import { SharedSystemProp, system } from '../system';

const internalV4Cidrs = [
  '127.0.0.0/8', // Loopback addresses
  '10.0.0.0/8', // Private network (RFC 1918)
  '172.16.0.0/12', // Private network (RFC 1918)
  '192.168.0.0/16', // Private network (RFC 1918)
  '169.254.0.0/16', // Link-local addresses
  '224.0.0.0/4', // Multicast addresses
  '0.0.0.0/8', // Reserved (RFC 6890)
  '240.0.0.0/4', // Reserved for future use
  '255.255.255.255/32', // Broadcast address
  '100.64.0.0/10', // Carrier-Grade NAT (CGNAT)
  '192.0.2.0/24', // Documentation and test (TEST-NET-1)
  '198.51.100.0/24', // Documentation and test (TEST-NET-2)
  '203.0.113.0/24', // Documentation and test (TEST-NET-3)
  '198.18.0.0/15', // Benchmarking (RFC 2544)
];

const internalV6Cidrs = [
  '::1/128', // Loopback address
  'fc00::/7', // Unique local addresses (ULA, RFC 4193)
  'fe80::/10', // Link-local addresses
  'ff00::/8', // Multicast addresses
  '::/128', // Unspecified address
  '2001:db8::/32', // Documentation and test (RFC 3849)
  '2001::/32', // Teredo tunneling
  '2002::/16', // 6to4 prefix
];

async function isInternalHost(host: string): Promise<boolean> {
  if (isIPv4(host)) return ipRangeCheck(host, internalV4Cidrs);

  if (isIPv6(host)) return ipRangeCheck(host, internalV6Cidrs);

  // If host is a URL, extract the hostname from it
  const hostMatches = /^(?:[\w-]+:\/\/)?([^/:?&]+)/.exec(host);
  if (!hostMatches || !hostMatches[1]) throw new Error('Invalid host');
  host = hostMatches[1];

  const [addresses4, addresses6] = await Promise.all([
    dns.resolve4(host).catch(() => []),
    dns.resolve6(host).catch(() => []),
  ]);

  if ([...addresses4, ...addresses6].length == 0)
    throw new Error('Failed to resolve host');

  return (
    addresses4.some((ip) => ipRangeCheck(ip, internalV4Cidrs)) ||
    addresses6.some((ip) => ipRangeCheck(ip, internalV6Cidrs))
  );
}

export async function validateHost(host: string | undefined): Promise<void> {
  const isHostValidationEnabled = system.getBoolean(
    SharedSystemProp.ENABLE_HOST_VALIDATION,
  );
  if (!isHostValidationEnabled || !host) return;
  const isPrivate = await isInternalHost(host);
  if (isPrivate) throw new Error('Host must not be an internal address');
}
