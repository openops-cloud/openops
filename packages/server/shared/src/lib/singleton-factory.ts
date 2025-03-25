const singletons = new Map<string, Promise<unknown>>();

export function createSingleton<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  if (!singletons.has(key)) {
    const promise = factory().then((result) => {
      singletons.set(key, Promise.resolve(result));
      return result;
    });

    singletons.set(key, promise);
  }

  return singletons.get(key) as Promise<T>;
}
