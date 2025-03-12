import { Timeseries } from 'prometheus-remote-write';

const axiosMock = {
  ...jest.requireActual('axios'),
  post: jest.fn(),
};

const systemMock = {
  get: jest.fn(),
  getBoolean: jest.fn(),
};

const logzioCollectorMock = {
  startMetricsCollector: jest.fn(),
  saveMetric: jest.fn(() => Promise.resolve()),
  flushMetricsCollector: jest.fn(() => Promise.resolve()),
};

jest.mock('../src/lib/logger');
jest.mock('axios', () => axiosMock);
jest.mock('../src/lib/system', () => ({
  ...jest.requireActual('../src/lib/system'),
  system: systemMock,
}));
jest.mock('../src/lib/telemetry/logzio-collector', () => logzioCollectorMock);

import { WorkflowEventName } from '../src/lib/telemetry/event-models';
import { TelemetryEvent } from '../src/lib/telemetry/telemetry-event';

function getSUT() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../src/lib/telemetry/telemetry').telemetry;
}

describe('telemetry', () => {
  let getEnvironmentId: jest.Mock;
  let telemetry: typeof import('../src/lib/telemetry/telemetry').telemetry;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    getEnvironmentId = jest
      .fn()
      .mockResolvedValue('123e4567-e89b-12d3-a456-426614174000');
  });

  describe('start', () => {
    it('should not start if telemetry is disabled', async () => {
      systemMock.getBoolean.mockReturnValue(false);

      telemetry = getSUT();

      await telemetry.start(getEnvironmentId);
      expect(getEnvironmentId).not.toHaveBeenCalled();
      expect(logzioCollectorMock.startMetricsCollector).not.toHaveBeenCalled();
    });

    it('should throw an error if telemetry is enabled but no URLs are provided', async () => {
      systemMock.get.mockReturnValue(null);
      systemMock.getBoolean.mockReturnValue(true);

      telemetry = getSUT();

      await expect(telemetry.start(getEnvironmentId)).rejects.toThrow(
        'Telemetry is enabled, but neither TELEMETRY_COLLECTOR_URL nor LOGZIO_METRICS_TOKEN is defined.',
      );
    });

    it('should start metric collector if no telemetry URL is provided', async () => {
      systemMock.getBoolean.mockReturnValue(true);
      systemMock.get.mockImplementation((key) =>
        key === 'LOGZIO_METRICS_TOKEN' ? 'logzio-token' : null,
      );

      telemetry = getSUT();

      await telemetry.start(getEnvironmentId);
      expect(getEnvironmentId).toHaveBeenCalled();
      expect(logzioCollectorMock.startMetricsCollector).toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    const event: TelemetryEvent = {
      name: WorkflowEventName.CREATED_WORKFLOW,
      labels: {
        flowId: 'value',
        projectId: 'projectId',
      },
    };
    const expectedTimeseries: Timeseries = {
      labels: {
        eventName: event.name,
        flowId: 'value',
        version: '0.0.1',
        projectId: 'projectId',
        environmentId: 'undefined',
        __name__: `${event.name}_total`,
        timestamp: '2023-11-25T12:00:00.000Z',
      },
      samples: [
        {
          timestamp: 1700913600000,
          value: 1,
        },
      ],
    };

    it('should not track event if telemetry is disabled', () => {
      systemMock.getBoolean.mockReturnValue(false);

      telemetry = getSUT();
      telemetry.trackEvent(event);

      expect(axiosMock.post).not.toHaveBeenCalled();
      expect(logzioCollectorMock.saveMetric).not.toHaveBeenCalled();
    });

    it('should send event to collector if URL is provided', async () => {
      systemMock.getBoolean.mockReturnValue(true);
      systemMock.get.mockReturnValue('https://collector.example.com');

      telemetry = getSUT();
      telemetry.trackEvent(event);

      expect(axiosMock.post).toHaveBeenCalledWith(
        'https://collector.example.com',
        expect.any(Object),
        { timeout: 10000 },
      );
    });

    it('should save metric to Logzio if no telemetry URL', async () => {
      const fixedDate = new Date('2023-11-25T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);

      systemMock.getBoolean.mockReturnValue(true);
      systemMock.get.mockImplementation((key) => {
        if (key === 'LOGZIO_METRICS_TOKEN') {
          return 'logzio-token';
        }

        if (key === 'VERSION') {
          return '0.0.1';
        }
        return null;
      });

      telemetry = getSUT();
      telemetry.trackEvent(event);

      expect(logzioCollectorMock.saveMetric).toHaveBeenCalledWith(
        expectedTimeseries,
      );
      jest.restoreAllMocks();
    });
  });

  describe('flush', () => {
    it('should flush metrics if Logzio is enabled', async () => {
      systemMock.getBoolean.mockReturnValue(true);
      systemMock.get.mockImplementation((key) =>
        key === 'LOGZIO_METRICS_TOKEN' ? 'logzio-token' : null,
      );

      telemetry = getSUT();
      await telemetry.flush();

      expect(logzioCollectorMock.flushMetricsCollector).toHaveBeenCalled();
    });

    it('should not flush metrics if telemetry collector URL is defined', async () => {
      systemMock.getBoolean.mockReturnValue(true);
      systemMock.get.mockReturnValue('https://collector.example.com');

      telemetry = getSUT();
      await telemetry.flush();

      expect(logzioCollectorMock.flushMetricsCollector).not.toHaveBeenCalled();
    });
  });
});
