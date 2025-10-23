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

const telemetryMode = system.get<TelemetryMode>(AppSystemProp.TELEMETRY_MODE);
const telemetryCollectorUrl = system.get<string>(
  AppSystemProp.TELEMETRY_COLLECTOR_URL,
);
const logzioMetricToken = system.get<string>(
  SharedSystemProp.LOGZIO_METRICS_TOKEN,
);

const version = system.get<string>(SharedSystemProp.VERSION);

export enum TelemetryMode {
  DISABLED = 'DISABLED',
  COLLECTOR = 'COLLECTOR',
  LOGZIO = 'LOGZIO',
}

let isTelemetryEnabled = true;
let environmentId: UUID | undefined;
export const telemetry = {
  async start(getEnvironmentId: () => Promise<UUID>): Promise<void> {
    environmentId = await getEnvironmentId();

    switch (telemetryMode) {
      case TelemetryMode.COLLECTOR: {
        if (!telemetryCollectorUrl) {
          throw new Error(
            `System property OPS_${AppSystemProp.TELEMETRY_COLLECTOR_URL} is not defined, but telemetry mode is set to ${TelemetryMode.COLLECTOR}.`,
          );
        }

        logger.info('Using telemetry collector to save the telemetry events.');
        return;
      }
      case TelemetryMode.LOGZIO: {
        if (!logzioMetricToken) {
          throw new Error(
            `System property OPS_${SharedSystemProp.LOGZIO_METRICS_TOKEN} is not defined, but telemetry mode is set to ${TelemetryMode.LOGZIO}.`,
          );
        }

        logger.info('Using Logz.io to save the telemetry events.');
        startMetricsCollector();
        return;
      }
      default: {
        logger.debug('Telemetry is disabled.');
        isTelemetryEnabled = false;
      }
    }
  },
  trackEvent(event: TelemetryEvent): void {
    isTelemetryEnabledForCurrentUser(event.labels.userId)
      .then((isEnable) => {
        if (!isTelemetryEnabled || !isEnable) {
          return;
        }

        const timeseries = enrichEventLabels(event);

        if (telemetryMode === TelemetryMode.COLLECTOR) {
          // Send to OpenOps Collector
          sendToCollector(telemetryCollectorUrl!, timeseries).catch((error) => {
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
