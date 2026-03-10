import { GraphError } from '@microsoft/microsoft-graph-client';
import {
  microsoftGraphRetry,
  withGraphRetry,
} from '../src/lib/common/graph-retry';

describe('withGraphRetry', () => {
  it('should return the result if fn succeeds on the first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await withGraphRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 1,
      shouldRetry: () => true,
    });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed if fn fails initially', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');
    const onRetry = jest.fn();

    const result = await withGraphRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 1,
      shouldRetry: () => true,
      onRetry,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 1);
  });

  it('should throw the error if fn fails and shouldRetry returns false', async () => {
    const error = new Error('critical fail');
    const fn = jest.fn().mockRejectedValue(error);
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(
      withGraphRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 1,
        shouldRetry,
      }),
    ).rejects.toThrow(error);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(error);
  });

  it('should throw the last error after reaching max retries', async () => {
    const error = new Error('persistent fail');
    const fn = jest.fn().mockRejectedValue(error);
    const onRetry = jest.fn();

    await expect(
      withGraphRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 1,
        shouldRetry: () => true,
        onRetry,
      }),
    ).rejects.toThrow(error);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff for delays', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success');
    const onRetry = jest.fn();

    const startTime = Date.now();
    await withGraphRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      shouldRetry: () => true,
      onRetry,
    });
    const endTime = Date.now();

    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 10);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 2, 20);
    expect(endTime - startTime).toBeGreaterThanOrEqual(30);
  });
});

describe('microsoftGraphRetry', () => {
  it('should retry on 500+ errors', async () => {
    const error500 = new GraphError();
    error500.statusCode = 500;

    const error502 = new GraphError();
    error502.statusCode = 502;

    const fn = jest
      .fn()
      .mockRejectedValueOnce(error500)
      .mockRejectedValueOnce(error502)
      .mockResolvedValueOnce('success');

    const result = await microsoftGraphRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use default values if options are not provided', async () => {
    const error502 = new GraphError();
    error502.statusCode = 502;

    const fn = jest
      .fn()
      .mockRejectedValueOnce(error502)
      .mockRejectedValueOnce(error502)
      .mockResolvedValueOnce('success');

    const result = await microsoftGraphRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should allow overriding default values', async () => {
    const error502 = new GraphError();
    error502.statusCode = 502;

    const fn = jest.fn().mockRejectedValue(error502);

    await expect(
      microsoftGraphRetry(fn, {
        maxRetries: 2,
        initialDelayMs: 1,
      }),
    ).rejects.toThrow(error502);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on other errors (e.g., 401)', async () => {
    const error401 = new GraphError();
    error401.statusCode = 401;

    const fn = jest.fn().mockRejectedValue(error401);

    await expect(microsoftGraphRetry(fn)).rejects.toThrow(error401);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not retry on non-GraphError', async () => {
    const error = new Error('not a graph error');

    const fn = jest.fn().mockRejectedValue(error);

    await expect(microsoftGraphRetry(fn)).rejects.toThrow(error);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
