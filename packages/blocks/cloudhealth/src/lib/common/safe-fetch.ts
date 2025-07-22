import { extractErrorMessage } from './extract-error-message';

type FetchResult<T> = {
  data: T;
  error?: string;
  disabled: boolean;
};

export async function safeFetch<T>(
  fetchFn: () => Promise<T>,
): Promise<FetchResult<T>> {
  try {
    const data = await fetchFn();
    return {
      data,
      disabled: false,
    };
  } catch (e) {
    return {
      data: [] as unknown as T,
      error: extractErrorMessage(e),
      disabled: true,
    };
  }
}
