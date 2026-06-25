import { HttpHeaders } from './http-headers';

const MAX_RETRY_DELAY_MS = 10 * 60 * 1000;
const COST_MANAGEMENT_RETRY_AFTER_HEADER_PATTERN =
  /^x-ms-ratelimit-microsoft\.costmanagement.*-retry-after$/i;

const AZURE_RETRY_AFTER_HEADERS = new Set([
  'x-ms-ratelimit-microsoft.consumption-retry-after',
  'x-ms-ratelimit-retailprices-retry-after',
]);

export function getAzureRetryDelayMs(
  headers: HttpHeaders | undefined,
): number | undefined {
  if (!headers) {
    return undefined;
  }

  const retryValues: string[] = [];

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (
      AZURE_RETRY_AFTER_HEADERS.has(headerName.toLowerCase()) ||
      COST_MANAGEMENT_RETRY_AFTER_HEADER_PATTERN.test(headerName)
    ) {
      retryValues.push(...normalizeHeaderValues(headerValue));
    }
  }

  if (retryValues.length === 0) {
    return undefined;
  }

  const retryDelaysMs = retryValues
    .map((value) => parseRetryDelayMs(value))
    .filter((value): value is number => value !== undefined);

  if (retryDelaysMs.length === 0) {
    return undefined;
  }

  return Math.max(...retryDelaysMs);
}

function normalizeHeaderValues(
  headerValue: string | string[] | undefined,
): string[] {
  if (!headerValue) {
    return [];
  }

  return Array.isArray(headerValue) ? headerValue : [headerValue];
}

function parseRetryDelayMs(headerValue: string): number | undefined {
  const trimmedValue = headerValue.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  const retryAfterSeconds = Number(trimmedValue);
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return undefined;
  }

  return Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS);
}
