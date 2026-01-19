import {
  AnalyticsAuthTokens,
  authenticateOpenOpsAnalyticsAdmin,
} from '@openops/common';
import { seedAnalyticsDashboards } from '../openops-analytics/analytics-seeding-service';
import { getAnalyticsAccessService } from './analytics/access-service-factory';

export const analyticsAuthenticationService = {
  async signUp(): Promise<AnalyticsAuthTokens> {
    await seedAnalyticsDashboards();

    return authenticateOpenOpsAnalyticsAdmin();
  },

  async authenticateAnalyticsRequest(
    userId: string,
    projectId: string,
  ): Promise<AnalyticsAuthTokens> {
    await getAnalyticsAccessService().verifyUserAnalyticsAccess(
      userId,
      projectId,
    );
    const authTokens = await authenticateOpenOpsAnalyticsAdmin();

    return authTokens;
  },
};
