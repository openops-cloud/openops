import { HttpHeaders } from './http-headers';

const MAX_RETRY_DELAY_MS = 10 * 60 * 1000;

function findHeaderValue(
  headers: HttpHeaders,
  name: string,
): string | undefined {
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

// Parses the RFC 7231 `Retry-After` response header into a delay in
// milliseconds. Supports both forms: delta-seconds ("120") and an HTTP-date
// ("Wed, 21 Oct 2025 07:28:00 GMT"). Returns undefined when the header is
// absent, non-positive, or unparseable. Capped at 10 minutes.
export function getStandardRetryAfterMs(
  headers: HttpHeaders | undefined,
): number | undefined {
  if (!headers) {
    return undefined;
  }

  const headerValue = findHeaderValue(headers, 'retry-after');
  if (!headerValue || headerValue.trim().length === 0) {
    return undefined;
  }

  const trimmedValue = headerValue.trim();

  if (/^\d+$/.test(trimmedValue)) {
    const retryAfterSeconds = Number(trimmedValue);
    if (retryAfterSeconds <= 0) {
      return undefined;
    }
    return Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS);
  }

  const retryAtMs = Date.parse(trimmedValue);
  if (Number.isNaN(retryAtMs)) {
    return undefined;
  }

  const deltaMs = retryAtMs - Date.now();
  if (deltaMs <= 0) {
    return undefined;
  }

  return Math.min(deltaMs, MAX_RETRY_DELAY_MS);
}
