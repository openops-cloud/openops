import { requestContext } from '@fastify/request-context';
import axios from 'axios';
import { UUID } from 'node:crypto';
import { Timeseries } from 'prometheus-remote-write';
import { logger } from '../logger';
import { AppSystemProp, SharedSystemProp, system } from '../system';
import {
  flushMetricsCollector,
  saveMetric,
  startMetricsCollector,
} from './logzio-collector';
import { TelemetryEvent } from './telemetry-event';

const telemetryCollectorUrl = system.get<string>(
  AppSystemProp.TELEMETRY_COLLECTOR_URL,
);
const logzioMetricToken = system.get<string>(
  SharedSystemProp.LOGZIO_METRICS_TOKEN,
);
const version = system.get<string>(SharedSystemProp.VERSION);

let environmentId: UUID | undefined;
export const telemetry = {
  async start(getEnvironmentId: () => Promise<UUID>): Promise<void> {
    if (!telemetryCollectorUrl && !logzioMetricToken) {
      throw new Error(
        'Telemetry is enabled, but neither TELEMETRY_COLLECTOR_URL nor LOGZIO_METRICS_TOKEN is defined.',
      );
    }

    environmentId = await getEnvironmentId();
    if (telemetryCollectorUrl) {
      return;
    }

    startMetricsCollector();
  },
  trackEvent(event: TelemetryEvent): void {
    try {
      const isEnable = isTelemetryEnabledForCurrentUser();
      if (!isEnable) {
        return;
      }

      const timeseries = enrichEventLabels(event);

      if (telemetryCollectorUrl) {
        // Send to OpenOps Collector
        sendToCollector(telemetryCollectorUrl, timeseries).catch((error) => {
          logger.error(
            'Error sending telemetry event to OpenOps Collector.',
            error,
          );
        });
        return;
      }

      saveMetric(timeseries).catch((error) => {
        logger.error('Error sending telemetry event to Logzio.', error);
      });
    } catch (error) {
      logger.error(`Failed to track telemetry event [${event.name}]`, {
        error,
        event,
      });
    }
  },
  async flush(): Promise<void> {
    if (telemetryCollectorUrl) {
      return;
    }

    await flushMetricsCollector();
  },
};

function enrichEventLabels(event: TelemetryEvent): Timeseries {
  const userId = requestContext.get('userId' as never);
  if (userId) {
    event.labels['userId'] = userId as string;
  }

  const timestamp = new Date();
  return {
    labels: {
      ...event.labels,
      eventName: event.name,
      version: version ?? 'unknown',
      __name__: `${event.name}_total`,
      environmentId: `${environmentId}`,
      timestamp: timestamp.toISOString(),
    },
    samples: [
      {
        value: event.value ?? 1,
        timestamp: timestamp.valueOf(),
      },
    ],
  };
}

function isTelemetryEnabledForCurrentUser(): boolean {
  return requestContext.get('trackEvents' as never) === 'true';
}

async function sendToCollector(
  telemetryCollectorUrl: string,
  requestBody: Timeseries,
): Promise<void> {
  requestBody.labels['environment'] = 'unknown';

  await axios.post(telemetryCollectorUrl, requestBody, {
    timeout: 10000,
  });
}
