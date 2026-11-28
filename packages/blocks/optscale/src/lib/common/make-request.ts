import {
  createRetryConfig,
  httpClient,
  HttpError,
  HttpMethod,
} from '@openops/blocks-common';

export interface OptScaleAuth {
  baseUrl: string;
  email: string;
  password: string;
}

export type OptScaleQueryValue =
  string | number | boolean | Array<string | number> | undefined | null;

const REQUEST_TIMEOUT_MS = 120_000;
// OptScale tokens live for days; reuse one per connection within a run instead
// of minting a new token for every request.
const TOKEN_CACHE_TTL_MS = 5 * 60_000;
const retryConfig = createRetryConfig();
const tokenCache = new WeakMap<
  OptScaleAuth,
  { token: Promise<string>; expiresAt: number }
>();

export function getHostUrl(auth: OptScaleAuth): string {
  const value = auth.baseUrl.trim().replace(/\/+$/, '');
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `Invalid OptScale URL "${auth.baseUrl}". Use a full URL such as https://my.optscale.com`,
    );
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(
      `Invalid OptScale URL "${auth.baseUrl}". The URL must start with https:// or http://`,
    );
  }

  return value;
}

export function getRestApiUrl(auth: OptScaleAuth): string {
  return `${getHostUrl(auth)}/restapi/v2`;
}

export function pathSegment(value: string): string {
  return encodeURIComponent(String(value).trim());
}

async function requestToken(auth: OptScaleAuth): Promise<string> {
  const hostUrl = getHostUrl(auth);

  try {
    const response = await httpClient.sendRequest<{ token: string }>(
      {
        method: HttpMethod.POST,
        url: `${hostUrl}/auth/v2/tokens`,
        body: { email: auth.email, password: auth.password },
        timeout: REQUEST_TIMEOUT_MS,
      },
      retryConfig,
    );

    return response.body.token;
  } catch (error) {
    throw toOptScaleError(error, hostUrl);
  }
}

export function signIn(auth: OptScaleAuth): Promise<string> {
  const cached = tokenCache.get(auth);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const token = requestToken(auth);
  tokenCache.set(auth, { token, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
  token.catch(() => tokenCache.delete(auth));

  return token;
}

export async function sendOptScaleRequest<T = unknown>({
  auth,
  method,
  path,
  query,
  body,
}: {
  auth: OptScaleAuth;
  method: HttpMethod;
  path: string;
  query?: Record<string, OptScaleQueryValue>;
  body?: unknown;
}): Promise<T> {
  const restApiUrl = getRestApiUrl(auth);
  const token = await signIn(auth);

  try {
    const response = await httpClient.sendRequest<T>(
      {
        method,
        url: `${restApiUrl}${path}${buildQueryString(query)}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
        timeout: REQUEST_TIMEOUT_MS,
      },
      retryConfig,
    );

    return response.body;
  } catch (error) {
    if (error instanceof HttpError && error.response.status === 401) {
      tokenCache.delete(auth);
    }
    throw toOptScaleError(error, restApiUrl);
  }
}

// OptScale expects repeated keys for list filters (?type=a&type=b),
// which the framework's flat QueryParams record cannot express.
export function buildQueryString(
  query?: Record<string, OptScaleQueryValue>,
): string {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      params.append(key, String(item));
    }
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export function toOptScaleError(error: unknown, url: string): Error {
  if (error instanceof HttpError) {
    const { status, body } = error.response;

    // The HTTP client reports requests that got no response (DNS failure,
    // refused connection, timeout) as status 500 with an empty body.
    if (body === undefined) {
      return new Error(
        `Could not reach OptScale at ${url}. Check the OptScale URL and that the host is reachable.`,
      );
    }

    const details = (
      body as { error?: { error_code?: string; reason?: string } }
    )?.error;

    if (details?.reason) {
      const code = details.error_code ? ` ${details.error_code}` : '';
      return new Error(
        `OptScale API error ${status}${code}: ${details.reason}`,
      );
    }

    return new Error(`OptScale API error ${status}: ${JSON.stringify(body)}`);
  }

  return error instanceof Error ? error : new Error(String(error));
}

export function toOptionalInteger(
  value: number | undefined | null,
  fieldName: string,
  minimum: number,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(
      `${fieldName} must be a whole number of at least ${minimum}`,
    );
  }

  return value;
}
