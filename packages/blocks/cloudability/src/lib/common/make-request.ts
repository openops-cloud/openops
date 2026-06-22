import {
  createRetryConfig,
  getStandardRetryAfterMs,
  httpClient,
  HttpMethod,
} from '@openops/blocks-common';
import { AxiosError } from 'axios';
import { CloudabilityAuth } from '../auth';

const retryConfig = createRetryConfig({ retryDelay: cloudabilityRetryDelayMs });

function cloudabilityRetryDelayMs(
  retryCount: number,
  error: AxiosError,
): number {
  const retryAfterMs = getStandardRetryAfterMs(error.response?.headers as any);

  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }

  const statusCode = error.response?.status;
  const remaining = Number(error.response?.headers?.['x-ratelimit-remaining']);

  if (statusCode === 429 && !Number.isNaN(remaining) && remaining > 5) {
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
