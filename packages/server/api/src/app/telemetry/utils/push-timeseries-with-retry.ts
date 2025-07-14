import { logger } from '@openops/server-shared';
import { Timeseries, pushTimeseries } from 'prometheus-remote-write';

type PushTimeseriesConfig = {
  url: string;
  headers?: Record<string, string>;
};

const DEFAULT_MAX_RETRIES = 3;

export async function pushTimeseriesWithRetry(
  timeseries: Timeseries[],
  config: PushTimeseriesConfig,
  maxRetries = DEFAULT_MAX_RETRIES,
): Promise<void> {
  let retryCount = 0;
  let lastError;
  while (retryCount < maxRetries) {
    try {
      await pushTimeseries(timeseries, config);
      return;
    } catch (err) {
      lastError = err;
      retryCount++;
      if (retryCount < maxRetries) {
        logger.debug(`Retry ${retryCount} failed: ${err}`);
        await new Promise((res) =>
          setTimeout(res, Math.pow(2, retryCount) * 100),
        );
      }
    }
  }
  throw lastError;
}
