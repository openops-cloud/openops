export type PromiseResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

export async function promisePool<T>(
  tasks: (() => Promise<T>)[],
  poolSize: number,
): Promise<PromiseResult<T>[]> {
  const results: PromiseResult<T>[] = [];
  let currentIndex = 0;

  const runNext = async (): Promise<void> => {
    if (currentIndex >= tasks.length) return;

    const index = currentIndex++;

    try {
      const value = await tasks[index]();
      results[index] = { status: 'fulfilled', value };
    } catch (err) {
      results[index] = { status: 'rejected', reason: err };
    }

    await runNext();
  };

  const pool = Array.from({ length: poolSize }, () => runNext());
  await Promise.all(pool);

  return results;
}
