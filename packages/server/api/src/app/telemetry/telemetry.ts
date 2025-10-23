import {
  AppSystemProp,
  logger,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import axios from 'axios';
import { UUID } from 'node:crypto';
import { Timeseries } from 'prometheus-remote-write';
import { userService } from '../user/user-service';
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

const isTelemetryEnabled = Boolean(telemetryCollectorUrl || logzioMetricToken);
const version = system.get<string>(SharedSystemProp.VERSION);

let environmentId: UUID | undefined;
export const telemetry = {
  async start(getEnvironmentId: () => Promise<UUID>): Promise<void> {
    if (!isTelemetryEnabled) {
      logger.debug(
        'Telemetry is disabled because either TELEMETRY_COLLECTOR_URL or LOGZIO_METRICS_TOKEN is undefined.',
      );
      return;
    }

    environmentId = await getEnvironmentId();
    if (telemetryCollectorUrl) {
      logger.info('Using telemetry collector to save the telemetry events.');
      return;
    }

    logger.info('Using Logz.io to save the telemetry events.');
    startMetricsCollector();
  },
  trackEvent(event: TelemetryEvent): void {
    isTelemetryEnabledForCurrentUser(event.labels.userId)
      .then((isEnable) => {
        if (!isTelemetryEnabled || !isEnable) {
          return;
        }

        const timeseries = enrichEventLabels(event);

        if (telemetryCollectorUrl) {
          // Send to OpenOps Collector
          sendToCollector(telemetryCollectorUrl, timeseries).catch((error) => {
            logger.error(
              'Error sending telemetry event to OpenOps Collector.',
              { error, event },
            );
          });
          return;
        }

        saveMetric(timeseries).catch((error) => {
          logger.error('Error sending telemetry event to Logzio.', {
            error,
            event,
          });
        });
      })
      .catch((error) => {
        logger.error(`Failed to track telemetry event [${event.name}]`, {
          error,
          event,
        });
      });
  },
  async flush(): Promise<void> {
    if (telemetryCollectorUrl) {
      return;
    }

    await flushMetricsCollector();
  },
};

function enrichEventLabels(event: TelemetryEvent): Timeseries {
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

async function isTelemetryEnabledForCurrentUser(
  userId: string,
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  return (await userService.getTrackEventsConfig(userId)) === 'true';
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
