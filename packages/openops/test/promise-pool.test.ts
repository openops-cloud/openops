import { promisePool } from '../src/lib/promise-pool';

describe('Promise pool', () => {
  it('should resolves all tasks successfully', async () => {
    const tasks = Array.from(
      { length: 5 },
      (_, i) => () => Promise.resolve(i * 2),
    );

    const results = await promisePool(tasks, 2);

    expect(results).toEqual([
      { status: 'fulfilled', value: 0 },
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 4 },
      { status: 'fulfilled', value: 6 },
      { status: 'fulfilled', value: 8 },
    ]);
  });

  it('should not run more than poolSize promises in parallel', async () => {
    let running = 0;
    let maxRunning = 0;

    const taskFactory = (i: number) => () =>
      new Promise<number>((resolve) => {
        running++;
        maxRunning = Math.max(maxRunning, running);

        setTimeout(() => {
          running--;
          resolve(i);
        }, 20);
      });

    const tasks = Array.from({ length: 20 }, (_, i) => taskFactory(i));
    const results = await promisePool(tasks, 5);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(results.map((r) => (r as any).value)).toEqual(
      Array.from({ length: 20 }, (_, i) => i),
    );
    expect(maxRunning).toBeLessThanOrEqual(5);
  });

  it('returns rejected promises with original reason', async () => {
    const error = new Error('custom failure');

    const tasks = [
      () => Promise.resolve('ok'),
      () => Promise.reject(error),
      () => Promise.resolve('ok'),
    ];

    const results = await promisePool(tasks, 2);

    expect(results).toEqual([
      { status: 'fulfilled', value: 'ok' },
      { status: 'rejected', reason: error },
      { status: 'fulfilled', value: 'ok' },
    ]);
  });
});
