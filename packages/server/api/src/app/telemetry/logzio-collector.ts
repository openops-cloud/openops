import { logger, SharedSystemProp, system } from '@openops/server-shared';
import { Mutex } from 'async-mutex';
import { pushTimeseries, Timeseries } from 'prometheus-remote-write';
import { TelemetryEvent } from './telemetry-event';

const logzioMetricToken = system.getOrThrow<string>(
  SharedSystemProp.LOGZIO_METRICS_TOKEN,
);
const environmentName = system.getOrThrow<string>(
  SharedSystemProp.ENVIRONMENT_NAME,
);

const lock = new Mutex();
let metrics: Timeseries[] = [];

async function sendMetrics(): Promise<void> {
  await lock.runExclusive(async () => {
    try {
      if (metrics.length === 0) {
        return;
      }

      const metricsToSend = [...metrics];
      await pushTimeseries(metricsToSend, {
        url: 'https://listener.logz.io:8053',
        headers: {
          Authorization: `Bearer ${logzioMetricToken}`,
        },
      });

      metrics = [];
    } catch (error) {
      logger.error('Failed to send telemetry events to Logzio.', {
        error,
        metricsCount: metrics.length,
      });
    }
  });
}

export async function saveMetric(timeseries: Timeseries): Promise<void> {
  timeseries.labels['environment'] = environmentName;

  await lock.runExclusive(async () => {
    metrics.push(timeseries);
  });
}

let metricsIntervalId: NodeJS.Timeout | null = null;

export function startMetricsCollector(): void {
  if (metricsIntervalId !== null) {
    throw new Error('The metrics collector has already started.');
  }

  metricsIntervalId = setInterval(() => {
    sendMetrics().catch((error) => {
      logger.error('Error in metrics collector.', error);
    });
  }, 60 * 1000);
}

export async function flushMetricsCollector(): Promise<void> {
  try {
    if (metricsIntervalId !== null) {
      clearInterval(metricsIntervalId);
      metricsIntervalId = null;
    }

    await sendMetrics();
  } catch (error) {
    logger.error('Error flushing metrics collector.', error);
  }
}
