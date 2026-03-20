import { logger } from '@openops/server-shared';
import { InfrastructureError } from './execution-errors';

export const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type');
  const text = await response.text();

  if (contentType && !contentType.includes('application/json')) {
    logger.warn('Expected JSON response but received non-JSON content type', {
      status: response.status,
      contentType,
      body: text,
    });
    throw new InfrastructureError(
      `Expected JSON response, but received status ${response.status} and ${contentType}.`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    logger.warn('Failed to parse JSON response', {
      status: response.status,
      body: text,
    });
    throw new InfrastructureError(
      `Failed to parse JSON response with status ${response.status}.`,
      e,
    );
  }
};
