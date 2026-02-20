import { logger } from '@openops/server-shared';
import {
  createAxiosHeadersForAnalytics,
  makeOpenOpsAnalyticsPost,
} from './requests-helpers';

interface DashboardEmbedResponse {
  result: {
    uuid: string;
    allowed_domains: string[];
  };
}

export async function enableDashboardEmbedding(
  accessToken: string,
  slugOrId: string,
): Promise<DashboardEmbedResponse> {
  const headers = createAxiosHeadersForAnalytics(accessToken);

  try {
    return await makeOpenOpsAnalyticsPost<DashboardEmbedResponse>(
      `dashboard/${slugOrId}/embedded`,
      { allowed_domains: [] },
      headers,
    );
  } catch (error) {
    logger.error('Failed to enable embedding for dashboard', {
      slugOrId,
      error,
    });
    throw error;
  }
}
