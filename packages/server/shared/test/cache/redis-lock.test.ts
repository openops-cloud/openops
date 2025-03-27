const loggerMock = {
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
};
jest.mock('../../src/lib/logger', () => ({
  logger: loggerMock,
}));

jest.mock('../../src/lib/system/system', () => ({
  QueueMode: {
    REDIS: 'REDIS',
    MEMORY: 'MEMORY',
  },
  system: {
    get: jest.fn().mockReturnValue('REDIS'),
  },
}));

const createRedisClientMock = jest.fn().mockReturnValue({});
jest.mock('../../src/lib/cache/redis-connection', () => ({
  createRedisClient: createRedisClientMock,
}));

jest.mock('redlock');

import RedLock from 'redlock';

describe('acquireRedisLock', () => {
  const mockAcquire = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (RedLock as unknown as jest.Mock).mockImplementation(() => ({
      acquire: mockAcquire,
    }));
  });

  it('should acquire a redis lock successfully', async () => {
    const fakeLock = { resource: 'lock', value: 'abc', ttl: 12345 };
    mockAcquire.mockResolvedValue(fakeLock);

    const key = 'test-key';
    const timeout = 30000;

    const { acquireRedisLock } = await import('../../src/lib/cache/redis-lock');

    const lock = await acquireRedisLock(key, timeout);

    expect(createRedisClientMock).toHaveBeenCalled();
    expect(mockAcquire).toHaveBeenCalledWith(
      [key],
      timeout,
      expect.objectContaining({
        retryDelay: expect.any(Number),
        retryJitter: expect.any(Number),
      }),
    );

    expect(lock).toBe(fakeLock);
    expect(loggerMock.debug).toHaveBeenCalledWith(
      expect.stringContaining('Acquiring lock'),
      { key, timeout },
    );
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining('Acquired lock'),
      { key, timeout },
    );
  });

  it('should log and throw if lock acquisition fails', async () => {
    const key = 'fail-key';
    const timeout = 10000;
    const error = new Error('Failed to lock');

    mockAcquire.mockRejectedValue(error);

    const { acquireRedisLock } = await import('../../src/lib/cache/redis-lock');

    await expect(acquireRedisLock(key, timeout)).rejects.toThrow(error);

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to acquire lock'),
      { key, timeout },
    );
  });
});
