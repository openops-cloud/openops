import { logger } from '@openops/server-shared';

export const safeResponseJson = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    const text = await response.text();
    const message = `Expected JSON response, but received ${contentType}. Body: ${text.slice(
      0,
      100,
    )}${text.length > 100 ? '...' : ''}`;
    logger.warn(message);
    throw new Error(message);
  }

  try {
    return await response.json();
  } catch (e) {
    const text = await response.text();
    const message = `Failed to parse JSON response. Body: ${text.slice(
      0,
      100,
    )}${text.length > 100 ? '...' : ''}`;
    logger.warn(message);
    throw new Error(message);
  }
};
