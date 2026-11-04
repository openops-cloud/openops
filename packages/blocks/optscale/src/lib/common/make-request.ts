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
const retryConfig = createRetryConfig();

export function getHostUrl(auth: OptScaleAuth): string {
  return auth.baseUrl.trim().replace(/\/+$/, '');
}

export function getRestApiUrl(auth: OptScaleAuth): string {
  return `${getHostUrl(auth)}/restapi/v2`;
}

export async function signIn(auth: OptScaleAuth): Promise<string> {
  try {
    const response = await httpClient.sendRequest<{ token: string }>(
      {
        method: HttpMethod.POST,
        url: `${getHostUrl(auth)}/auth/v2/tokens`,
        body: { email: auth.email, password: auth.password },
        timeout: REQUEST_TIMEOUT_MS,
      },
      retryConfig,
    );

    return response.body.token;
  } catch (error) {
    throw toOptScaleError(error);
  }
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
  const token = await signIn(auth);

  try {
    const response = await httpClient.sendRequest<T>(
      {
        method,
        url: `${getRestApiUrl(auth)}${path}${buildQueryString(query)}`,
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
    throw toOptScaleError(error);
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

export function toOptScaleError(error: unknown): Error {
  if (error instanceof HttpError) {
    const { status, body } = error.response;
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
