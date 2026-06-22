import { logger } from '@openops/server-shared';
import { AxiosError } from 'axios';
import { IAxiosRetryConfig, isIdempotentRequestError } from 'axios-retry';
import { HttpHeaders } from '../core/http-headers';
import { getStandardRetryAfterMs } from '../core/standard-retry-after';

const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 200;

function defaultRetryCondition(error: AxiosError): boolean {
  // Always retry 429s regardless of method — rate limited means the request
  // was never processed so repeating it is safe. Restrict 5xx/network retries
  // to idempotent methods to avoid duplicating POST side effects.
  return error.response?.status === 429 || isIdempotentRequestError(error);
}

function defaultRetryDelay(retryCount: number, error: AxiosError): number {
  const retryAfterMs = getStandardRetryAfterMs(
    error.response?.headers as HttpHeaders,
  );

  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }

  const exponentialDelayMs = DEFAULT_BASE_DELAY_MS * 2 ** (retryCount - 1);
  const jitterMs = Math.floor(Math.random() * 100);

  return exponentialDelayMs + jitterMs;
}

export function createRetryConfig(overrides?: {
  retryCondition?: (error: AxiosError) => boolean;
  retryDelay?: (retryCount: number, error: AxiosError) => number;
}): IAxiosRetryConfig {
  return {
    retries: DEFAULT_RETRIES,
    retryCondition: overrides?.retryCondition ?? defaultRetryCondition,
    retryDelay: overrides?.retryDelay ?? defaultRetryDelay,
    onRetry: (retryCount, error) => {
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
}
