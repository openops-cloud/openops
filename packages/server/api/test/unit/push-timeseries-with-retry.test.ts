import { Timeseries, pushTimeseries } from 'prometheus-remote-write';
import { pushTimeseriesWithRetry } from '../../src/app/telemetry/utils/push-timeseries-with-retry';

jest.mock('prometheus-remote-write', () => ({
  pushTimeseries: jest.fn(),
}));

jest.mock('@openops/server-shared', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

import { logger } from '@openops/server-shared';

describe('pushTimeseriesWithRetry', () => {
  const config = { url: 'http://example.com' };
  const timeseries: Timeseries[] = [
    {
      labels: { __name__: 'test_metric' },
      samples: [{ value: 1, timestamp: Date.now() }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('succeeds on first try', async () => {
    (pushTimeseries as jest.Mock).mockResolvedValueOnce(undefined);
    await expect(
      pushTimeseriesWithRetry(timeseries, config),
    ).resolves.toBeUndefined();
    expect(pushTimeseries).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('retries on failure and succeeds', async () => {
    const error = new Error('fail');
    (pushTimeseries as jest.Mock)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);
    await expect(
      pushTimeseriesWithRetry(timeseries, config, 2),
    ).resolves.toBeUndefined();
    expect(pushTimeseries).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith('Retry 1 failed: Error: fail');
  });

  it('fails after max retries', async () => {
    const error = new Error('fail');
    (pushTimeseries as jest.Mock).mockRejectedValue(error);
    await expect(
      pushTimeseriesWithRetry(timeseries, config, 2),
    ).rejects.toThrow('fail');
    expect(pushTimeseries).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith('Retry 1 failed: Error: fail');
  });

  it('logs multiple retry failures', async () => {
    const error = new Error('network error');
    (pushTimeseries as jest.Mock).mockRejectedValue(error);
    await expect(
      pushTimeseriesWithRetry(timeseries, config, 3),
    ).rejects.toThrow('network error');
    expect(pushTimeseries).toHaveBeenCalledTimes(3);

    expect(logger.debug).toHaveBeenCalledWith(
      'Retry 1 failed: Error: network error',
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Retry 2 failed: Error: network error',
    );
    expect(logger.debug).toHaveBeenCalledTimes(2);
  });
});
