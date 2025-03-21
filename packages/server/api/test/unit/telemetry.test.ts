import { Timeseries } from 'prometheus-remote-write';

const axiosMock = {
  ...jest.requireActual('axios'),
  post: jest.fn(),
};

const systemMock = {
  get: jest.fn(),
  getBoolean: jest.fn(),
};

const userServiceMock = {
  getTrackEventsConfig: jest.fn(),
};

const logzioCollectorMock = {
  startMetricsCollector: jest.fn(),
  saveMetric: jest.fn(() => Promise.resolve()),
  flushMetricsCollector: jest.fn(() => Promise.resolve()),
};

jest.mock('@openops/server-shared', () => {
  const actual = jest.requireActual('@openops/server-shared');
  return {
    ...actual,
    cacheWrapper: jest.fn(),
    system: {
      ...actual.system,
      ...systemMock,
    },
    logger: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };
});

jest.mock('axios', () => axiosMock);
jest.mock(
  '../../src/app/telemetry/logzio-collector',
  () => logzioCollectorMock,
);
jest.mock('../../src/app/user/user-service', () => ({
  userService: userServiceMock,
}));

import { WorkflowEventName } from '../../src/app/telemetry/event-models';
import { TelemetryEvent } from '../../src/app/telemetry/telemetry-event';

function getSUT() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../src/app/telemetry/telemetry').telemetry;
}

describe('telemetry', () => {
  let getEnvironmentId: jest.Mock;
  let telemetry: typeof import('../../src/app/telemetry/telemetry').telemetry;

  beforeEach(() => {
    jest.clearAllMocks();
    getEnvironmentId = jest
      .fn()
      .mockResolvedValue('123e4567-e89b-12d3-a456-426614174000');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('start', () => {
    it('should throw an error if telemetry is enabled but no URLs are provided', async () => {
      systemMock.get.mockReturnValue(null);

      telemetry = getSUT();

      await expect(telemetry.start(getEnvironmentId)).rejects.toThrow(
        'Telemetry is enabled, but neither TELEMETRY_COLLECTOR_URL nor LOGZIO_METRICS_TOKEN is defined.',
      );
    });

    it('should start metric collector if no telemetry URL is provided', async () => {
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
        userId: 'value',
        flowId: 'value',
        projectId: 'projectId',
      },
    };
    const expectedTimeseries: Timeseries = {
      labels: {
        userId: 'value',
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
      userServiceMock.getTrackEventsConfig.mockResolvedValueOnce('false');
      telemetry = getSUT();
      telemetry.trackEvent(event);

      expect(axiosMock.post).not.toHaveBeenCalled();
      expect(logzioCollectorMock.saveMetric).not.toHaveBeenCalled();
    });

    it('should send event to collector if URL is provided', async () => {
      systemMock.get.mockReturnValue('https://collector.example.com');
      userServiceMock.getTrackEventsConfig.mockResolvedValueOnce('true');

      telemetry = getSUT();
      telemetry.trackEvent(event);

      await new Promise((r) => setTimeout(r, 500));

      expect(axiosMock.post).toHaveBeenCalledWith(
        'https://collector.example.com',
        expect.any(Object),
        { timeout: 10000 },
      );
    });

    it('should save metric to Logzio if no telemetry URL', async () => {
      userServiceMock.getTrackEventsConfig.mockResolvedValueOnce('true');

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

      const fixedDate = new Date('2023-11-25T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);

      telemetry.trackEvent(event);
      await new Promise((r) => setTimeout(r, 500));

      expect(logzioCollectorMock.saveMetric).toHaveBeenCalledWith(
        expectedTimeseries,
      );
      jest.restoreAllMocks();
    });
  });

  describe('flush', () => {
    it('should flush metrics if Logzio is enabled', async () => {
      systemMock.get.mockImplementation((key) =>
        key === 'LOGZIO_METRICS_TOKEN' ? 'logzio-token' : null,
      );

      telemetry = getSUT();
      await telemetry.flush();

      expect(logzioCollectorMock.flushMetricsCollector).toHaveBeenCalled();
    });

    it('should not flush metrics if telemetry collector URL is defined', async () => {
      systemMock.get.mockReturnValue('https://collector.example.com');

      telemetry = getSUT();
      await telemetry.flush();

      expect(logzioCollectorMock.flushMetricsCollector).not.toHaveBeenCalled();
    });
  });
});
