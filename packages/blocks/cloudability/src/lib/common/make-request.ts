import { httpClient, HttpMethod } from '@openops/blocks-common';
import { logger } from '@openops/server-shared';
import { AxiosError } from 'axios';
import { isRetryableError } from 'axios-retry';
import { CloudabilityAuth } from '../auth';

const retryConfig = {
  retries: 3,

  retryCondition: (error: AxiosError) => {
    return isRetryableError(error);
  },

  retryDelay: (retryCount: number, error: AxiosError) => {
    return getCloudabilityRetryDelayMs(error, retryCount);
  },

  onRetry: (retryCount: number, error: AxiosError) => {
    logger.info('Retrying HTTP request', {
      retryCount,
      message: error.message,
      statusCode: error.response?.status,
      retryAfter: error.response?.headers?.['retry-after'],
      rateLimitLimit: error.response?.headers?.['x-ratelimit-limit'],
      rateLimitReset: error.response?.headers?.['x-ratelimit-reset'],
      rateLimitRemaining: error.response?.headers?.['x-ratelimit-remaining'],
    });
  },
};

function parseRetryAfterToMs(
  value: string | string[] | undefined,
): number | undefined {
  const retryAfter = Array.isArray(value) ? value[0] : value;

  if (!retryAfter) {
    return undefined;
  }

  // Retry-After can be seconds
  const seconds = Number(retryAfter);
  if (!Number.isNaN(seconds)) {
    return seconds * 1000;
  }

  // Or an HTTP date
  const dateMs = Date.parse(retryAfter);
  if (!Number.isNaN(dateMs)) {
    return Math.max(dateMs - Date.now(), 0);
  }

  return undefined;
}

function getCloudabilityRetryDelayMs(
  error: AxiosError,
  retryCount: number,
): number {
  const retryAfterMs = parseRetryAfterToMs(
    error.response?.headers?.['retry-after'],
  );

  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }

  const statusCode = error.response?.status;
  const remaining = Number(error.response?.headers?.['x-ratelimit-remaining']);

  if (statusCode === 429 && !isNaN(remaining) && remaining > 5) {
    const baseDelayMs = 100;

    const jitterMs = Math.floor(Math.random() * 100);

    return baseDelayMs + jitterMs;
  }

  if (statusCode === 429) {
    // Treat it as a per-minute quota and wait long enough to leave the current window.
    const baseDelayMs = 60_000;

    const jitterMs = Math.floor(Math.random() * 5_000);

    return baseDelayMs + jitterMs;
  }

  // For non-429 retryable errors
  const baseDelayMs = 200;
  const exponentialDelayMs = baseDelayMs * 2 ** (retryCount - 1);
  const jitterMs = Math.floor(Math.random() * 100);

  return exponentialDelayMs + jitterMs;
}

export async function makeRequest({
  auth,
  endpoint,
  method,
  queryParams,
  body,
}: {
  auth: CloudabilityAuth;
  endpoint: string;
  method: HttpMethod;
  queryParams?: Record<string, string>;
  body?: any;
}) {
  const { apiKey } = auth;
  const encoded = Buffer.from(`${apiKey}:`).toString('base64');

  const response = await httpClient.sendRequest(
    {
      method,
      url: `${auth.apiUrl}${endpoint}`,
      headers: {
        Authorization: `Basic ${encoded}`,
      },
      body,
      queryParams,
    },
    retryConfig,
  );

  return response.body;
}
