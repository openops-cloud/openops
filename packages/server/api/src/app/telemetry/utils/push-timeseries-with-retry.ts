import { logger } from '@openops/server-shared';
import { pushTimeseries, Timeseries } from 'prometheus-remote-write';

export type PushTimeseriesConfig = {
  url: string;
  headers?: Record<string, string>;
};

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

/**
 * Calculates exponential backoff delay for retry attempts
 * @param retryCount - Current retry attempt number (0-based)
 * @param baseDelayMs - Base delay in milliseconds
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(
  retryCount: number,
  baseDelayMs: number,
): number {
  return Math.pow(2, retryCount) * baseDelayMs;
}

export async function pushTimeseriesWithRetry(
  timeseries: Timeseries[],
  config: PushTimeseriesConfig,
  maxRetries = DEFAULT_MAX_RETRIES,
  delayFn = (ms: number) => new Promise((res) => setTimeout(res, ms)),
): Promise<void> {
  let retryCount = 0;
  let lastError: unknown;
  while (retryCount < maxRetries) {
    try {
      await pushTimeseries(timeseries, config);
      return;
    } catch (err) {
      lastError = err;
      retryCount++;
      if (retryCount < maxRetries) {
        logger.debug(`Retry ${retryCount}`, { error: err });
        await delayFn(calculateBackoffDelay(retryCount, BASE_DELAY_MS));
      }
    }
  }
  throw lastError;
}
