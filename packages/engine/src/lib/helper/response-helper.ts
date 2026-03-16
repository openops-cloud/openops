import { logger } from '@openops/server-shared';
import { InfrastructureError } from './execution-errors';

export const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type');
  const text = await response.text();

  if (contentType && !contentType.includes('application/json')) {
    logger.warn(
      {
        status: response.status,
        contentType,
        body: text,
      },
      'Expected JSON response but received non-JSON content type',
    );
    throw new InfrastructureError(
      `Expected JSON response, but received status ${response.status} and ${contentType}.`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    logger.warn(
      {
        status: response.status,
        body: text,
      },
      'Failed to parse JSON response',
    );
    throw new InfrastructureError(
      `Failed to parse JSON response with status ${response.status}.`,
      e,
    );
  }
};
