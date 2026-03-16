import { logger } from '@openops/server-shared';
import { InfrastructureError } from './execution-errors';

export const safeResponseJson = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    const text = await response.text();
    const message = `Expected JSON response, but received status ${response.status} and ${contentType}. Body: ${text}`;
    logger.warn(message);
    throw new InfrastructureError(message);
  }

  try {
    return await response.json();
  } catch (e) {
    const text = await response.text();
    const message = `Failed to parse JSON response with status ${response.status}. Body: ${text}`;
    logger.warn(message);
    throw new InfrastructureError(message, e);
  }
};
