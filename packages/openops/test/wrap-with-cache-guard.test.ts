const cacheStore = new Map<string, any>();
const loggerMock = {
  error: jest.fn(),
};
const cacheWrapperMock = {
  getSerializedObject: jest.fn((key: string) => cacheStore.get(key) || null),
  setSerializedObject: jest.fn(async (key: string, value: any) => {
    cacheStore.set(key, value);
  }),
};

let createdMutexes: any[] = [];
let createdSemaphores: any[] = [];
jest.mock('async-mutex', () => {
  const actual = jest.requireActual('async-mutex');
  const tryAcquireSpy = jest.fn(actual.tryAcquire);

  const mutexSpy = jest.fn().mockImplementation(() => {
    const instance = new actual.Mutex();
    jest.spyOn(instance, 'waitForUnlock');
    createdMutexes.push(instance);
    return instance;
  });

  const semaphoreSpy = jest.fn().mockImplementation((permits: number) => {
    const instance = new actual.Semaphore(permits);
    jest.spyOn(instance, 'waitForUnlock');
    createdSemaphores.push(instance);
    return instance;
  });

  return {
    ...actual,
    Mutex: mutexSpy,
    Semaphore: semaphoreSpy,
    tryAcquire: tryAcquireSpy,
  };
});

import {
  Mutex as MockedMutex,
  Semaphore as MockedSemaphore,
  tryAcquire as mockedTryAcquire,
} from 'async-mutex';

jest.mock('@openops/server-shared', () => ({
  flowTimeoutSandbox: 100000,
  logger: loggerMock,
  cacheWrapper: cacheWrapperMock,
}));

import { wrapWithCacheGuard } from '../src/lib/wrap-with-cache-guard';

describe('Wrap with cache guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheStore.clear();
    createdMutexes = [];
    createdSemaphores = [];
  });

  test('should call the wrapped function only once for each cache key', async () => {
    const expectedResult = 'table name 1';
    const numCalls = 500;
    const results = await Promise.all([
      ...Array.from({ length: numCalls }, (_) =>
        wrapWithCacheGuard('cacheKey-1', oneSecondSleep, expectedResult),
      ),
      ...Array.from({ length: numCalls }, (_) =>
        wrapWithCacheGuard('cacheKey-2', oneSecondSleep, expectedResult),
      ),
    ]);

    for (const result of results) {
      expect(result).toBe(expectedResult);
    }

    expect(oneSecondSleep).toHaveBeenCalledTimes(2);
    expect(loggerMock.error).toHaveBeenCalledTimes(0);

    expect(createdMutexes.length).toBe(1);
    expect(createdSemaphores.length).toBe(2);

    expect(MockedMutex).toHaveBeenCalledTimes(1);
    expect(MockedSemaphore).toHaveBeenCalledTimes(2);
    expect(createdSemaphores[0].waitForUnlock).toHaveBeenCalledTimes(
      numCalls - 1,
    );
    expect(createdSemaphores[1].waitForUnlock).toHaveBeenCalledTimes(
      numCalls - 1,
    );

    expect(mockedTryAcquire).toHaveBeenCalledTimes(numCalls * 4);
    expect(cacheWrapperMock.setSerializedObject).toHaveBeenCalledTimes(2);
  });
});

const oneSecondSleep = jest.fn(async (param: string) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return param;
});
