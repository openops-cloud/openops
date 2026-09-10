import { waitForConditionWithTimeout } from '../src/lib/condition-watcher';

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

describe('waitForConditionWithTimeout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should resolve if condition becomes true before timeout', async () => {
    const condition = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const promise = waitForConditionWithTimeout(condition, 100, 5);

    for (let i = 0; i < 100; i++) {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    }

    await expect(promise).resolves.toBeUndefined();
    expect(condition).toHaveBeenCalledTimes(2);
  });

  test('should reject with default message if timeout is reached', async () => {
    const condition = jest.fn().mockResolvedValue(false);

    const promise = waitForConditionWithTimeout(condition, 100, 1);
    for (let i = 0; i < 100; i++) {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    }

    await expect(promise).rejects.toThrow('Timed out after 1 seconds. ');
    expect(condition).toHaveBeenCalled();
  });

  test('should reject with custom message if timeout is reached', async () => {
    const condition = jest.fn().mockResolvedValue(false);
    const customMessage = 'Custom timeout message.';

    const promise = waitForConditionWithTimeout(
      condition,
      100,
      1,
      customMessage,
    );

    for (let i = 0; i < 100; i++) {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    }

    await expect(promise).rejects.toThrow(
      `Timed out after 1 seconds. With message: Custom timeout message.`,
    );
    expect(condition).toHaveBeenCalled();
  });

  test('should handle various delay and timeout configurations', async () => {
    const condition = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);

    const promise = waitForConditionWithTimeout(condition, 200, 2);

    for (let i = 0; i < 100; i++) {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    }

    await expect(promise).resolves.toBeUndefined();
    expect(condition).toHaveBeenCalledTimes(3);
  });
});
