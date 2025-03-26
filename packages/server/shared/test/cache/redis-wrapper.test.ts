let keyCallCounts: Record<string, number> = {};
jest.mock('../../src/lib/cache/redis-lock', () => {
  return {
    acquireRedisLock: jest.fn(async (key: string, ttl: number) => {
      keyCallCounts[key] = (keyCallCounts[key] || 0) + 1;

      if (keyCallCounts[key] === 1) {
        return {
          release: jest.fn(),
        };
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          release: jest.fn(),
        };
      }
    }),
  };
});

const mockRedisInstance = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  on: jest.fn(),
};

jest.mock('../../src/lib/cache/redis-connection', () => ({
  createRedisClient: jest.fn().mockReturnValue(mockRedisInstance),
}));

import { redisWrapper } from '../../src/lib/cache/redis-wrapper';

describe('Redis Wrapper', () => {
  beforeEach(() => {
    keyCallCounts = {};
    jest.clearAllMocks();
  });

  describe('setKey', () => {
    it('should set a key with default expiration', async () => {
      await redisWrapper.setKey('testKey', 'testValue');
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'testKey',
        'testValue',
        'EX',
        60 * 60,
      );
    });

    it('should set a key with custom expiration', async () => {
      await redisWrapper.setKey('testKey', 'testValue', 120);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'testKey',
        'testValue',
        'EX',
        120,
      );
    });
  });

  describe('getKey', () => {
    it('should get a key value', async () => {
      mockRedisInstance.get.mockResolvedValue('testValue');
      const value = await redisWrapper.getKey('testKey');
      expect(value).toBe('testValue');
      expect(mockRedisInstance.get).toHaveBeenCalledWith('testKey');
    });

    it('should return null if key does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const value = await redisWrapper.getKey('nonExistingKey');
      expect(value).toBeNull();
      expect(mockRedisInstance.get).toHaveBeenCalledWith('nonExistingKey');
    });
  });

  describe('deleteKey', () => {
    it('should delete a key', async () => {
      await redisWrapper.deleteKey('testKey');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('testKey');
    });
  });

  describe('keyExists', () => {
    it('should return true if the key exists', async () => {
      mockRedisInstance.exists.mockResolvedValue(1);
      const exists = await redisWrapper.keyExists('testKey');
      expect(exists).toBe(true);
      expect(mockRedisInstance.exists).toHaveBeenCalledWith('testKey');
    });

    it('should return false if the key does not exist', async () => {
      mockRedisInstance.exists.mockResolvedValue(0);
      const exists = await redisWrapper.keyExists('nonExistingKey');
      expect(exists).toBe(false);
      expect(mockRedisInstance.exists).toHaveBeenCalledWith('nonExistingKey');
    });
  });

  describe('setSerializedObject', () => {
    it('should set a serialized object with default expiration', async () => {
      const obj = { name: 'Alice', age: 30 };
      await redisWrapper.setSerializedObject('testKey', obj);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify(obj),
        'EX',
        60 * 60,
      );
    });

    it('should set a serialized object with custom expiration', async () => {
      const obj = { name: 'Alice', age: 30 };
      await redisWrapper.setSerializedObject('testKey', obj, 120);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify(obj),
        'EX',
        120,
      );
    });
  });

  describe('getSerializedObject', () => {
    it('should retrieve and parse a serialized object', async () => {
      const obj = { name: 'Alice', age: 30 };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(obj));
      const result = await redisWrapper.getSerializedObject<{
        name: string;
        age: number;
      }>('testKey');
      expect(result).toEqual(obj);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('testKey');
    });

    it('should return null if key does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const result = await redisWrapper.getSerializedObject<{
        name: string;
        age: number;
      }>('nonExistingKey');
      expect(result).toBeNull();
      expect(mockRedisInstance.get).toHaveBeenCalledWith('nonExistingKey');
    });
  });

  describe('getOrAdd', () => {
    it.each([true, false, 'table name 1', 3232, { test: 'test' }, [1, 2, 3]])(
      'should call the set method only once within the cache period for each key',
      async (expectedResult: unknown) => {
        const memoryStore: Record<string, unknown> = {};
        mockRedisInstance.set = jest.fn((key: string, value: unknown) => {
          memoryStore[key] = value;
          return Promise.resolve('OK');
        });
        mockRedisInstance.get = jest.fn((key: string) => {
          return Promise.resolve(memoryStore[key] ?? null);
        });

        const numCalls = 50;
        const results = await Promise.all([
          ...Array.from({ length: numCalls }, (_) =>
            redisWrapper.getOrAdd('cacheKey-1', halfSecondSleep, [
              expectedResult,
            ]),
          ),
          ...Array.from({ length: numCalls }, (_) =>
            redisWrapper.getOrAdd('cacheKey-2', halfSecondSleep, [
              expectedResult,
            ]),
          ),
        ]);

        for (const result of results) {
          expect(result).toStrictEqual(expectedResult);
        }

        expect(halfSecondSleep).toHaveBeenCalledTimes(2);
        expect(mockRedisInstance.get).toHaveBeenCalledTimes(numCalls * 4);
        expect(mockRedisInstance.set).toHaveBeenCalledTimes(2);
        expect(mockRedisInstance.set).toHaveBeenNthCalledWith(
          1,
          'cacheKey-1',
          JSON.stringify(expectedResult),
          'EX',
          60 * 60,
        );
        expect(mockRedisInstance.set).toHaveBeenNthCalledWith(
          2,
          'cacheKey-2',
          JSON.stringify(expectedResult),
          'EX',
          60 * 60,
        );
      },
    );
  });
});

const halfSecondSleep = jest.fn(async (param: unknown) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return param;
});
