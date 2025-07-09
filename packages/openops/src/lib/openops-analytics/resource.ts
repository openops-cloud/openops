import { logger } from '@openops/server-shared';
import axios from 'axios';
import {
  createAxiosHeadersForAnalytics,
  makeOpenOpsAnalyticsGet,
} from './requests-helpers';

// Gracefully tries to get a resource from superset, returning undefined if the resource is not found.
export async function tryGetResource<T>(
  token: string,
  endpoint: string,
  resourceName: string,
): Promise<T | undefined> {
  const authenticationHeader = createAxiosHeadersForAnalytics(token);

  try {
    const response = await makeOpenOpsAnalyticsGet<{ result: T }>(
      endpoint,
      authenticationHeader,
      true,
    );

    return response?.result ?? undefined;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return undefined;
    }

    const errorMessage = `Encountered an issue while trying to get ${resourceName}. Error: ${JSON.stringify(
      error,
    )}`;

    logger.error(errorMessage, { error });
    throw new Error(errorMessage);
  }
}
